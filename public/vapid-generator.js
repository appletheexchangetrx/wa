"use strict";

const CONFIG = Object.freeze({
  supabaseUrl: "https://axednjikcambzbkxyqpp.supabase.co",
  publishableKey: "sb_publishable_Vysddy5_b0uZ3iKgnkDTIw_X5O1pBEd",
  functionName: "trx-vapid-generator",
});

const apiUrl = `${CONFIG.supabaseUrl}/functions/v1/${CONFIG.functionName}`;
const generateButton = document.getElementById("generateButton");
const publicKeyField = document.getElementById("publicKey");
const privateKeyField = document.getElementById("privateKey");
const statusField = document.getElementById("status");

function setStatus(message, type = "info") {
  statusField.textContent = message;
  statusField.className = `status ${type}`;
}

async function generateVapidKeys() {
  // Operator enters the setup-only secret manually. Never persist it.
  let generatorSecret = window.prompt("Masukkan VAPID_GENERATOR_SECRET:");

  if (!generatorSecret) {
    setStatus("Generate dibatalkan: secret belum dimasukkan.", "error");
    return;
  }

  generateButton.disabled = true;
  generateButton.textContent = "Generating...";
  publicKeyField.value = "";
  privateKeyField.value = "";
  setStatus("Menghubungi Supabase Edge Function...");

  try {
    const response = await fetch(apiUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "apikey": CONFIG.publishableKey,
        "x-vapid-generator-secret": generatorSecret,
      },
      cache: "no-store",
    });

    const responseText = await response.text();
    let result;

    try {
      result = JSON.parse(responseText);
    } catch {
      throw new Error(
        `Server tidak mengembalikan JSON (HTTP ${response.status}). ${responseText.slice(0, 180)}`
      );
    }

    if (!response.ok) {
      throw new Error(result.error || `Request gagal (HTTP ${response.status}).`);
    }

    if (
      result.success !== true ||
      typeof result.VAPID_PUBLIC_KEY !== "string" ||
      typeof result.VAPID_PRIVATE_KEY !== "string"
    ) {
      throw new Error("Respons generator tidak berisi pasangan VAPID key yang lengkap.");
    }

    const jwk = JSON.parse(result.VAPID_PRIVATE_KEY);
    if (jwk.kty !== "EC" || jwk.crv !== "P-256" || !jwk.d || !jwk.x || !jwk.y) {
      throw new Error("Private key bukan JSON JWK ECDSA P-256 yang valid.");
    }

    publicKeyField.value = result.VAPID_PUBLIC_KEY;
    privateKeyField.value = result.VAPID_PRIVATE_KEY;
    setStatus("VAPID key pair berhasil dibuat. Salin dan simpan kedua key dengan aman.", "success");
  } catch (error) {
    console.error("VAPID generator failed:", error);
    setStatus(error instanceof Error ? error.message : "Terjadi kesalahan yang tidak diketahui.", "error");
  } finally {
    // Drop the reference as soon as the request completes.
    generatorSecret = "";
    generateButton.disabled = false;
    generateButton.textContent = "Generate VAPID Keys";
  }
}

async function copyKey(field, button) {
  if (!field.value) {
    setStatus("Belum ada key untuk disalin.", "error");
    return;
  }

  try {
    await navigator.clipboard.writeText(field.value);
    const originalLabel = button.textContent;
    button.textContent = "Copied!";
    window.setTimeout(() => { button.textContent = originalLabel; }, 1400);
  } catch (error) {
    console.error("Clipboard failed:", error);
    field.focus();
    field.select();
    setStatus("Clipboard tidak tersedia. Key sudah dipilih; salin secara manual.", "error");
  }
}

generateButton.addEventListener("click", generateVapidKeys);

document.querySelectorAll("[data-copy]").forEach((button) => {
  button.addEventListener("click", () => {
    const field = document.getElementById(button.dataset.copy);
    if (field) void copyKey(field, button);
  });
});
