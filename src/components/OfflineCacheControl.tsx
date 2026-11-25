import {useState} from 'react';
import {Trash2} from 'lucide-react';
import {clearCachedMessages} from '../lib/offline';
export default function OfflineCacheControl(){
  const [busy,setBusy]=useState(false),[message,setMessage]=useState('');
  const clear=async()=>{if(busy||!window.confirm('Hapus riwayat pesan offline di perangkat ini? Data di Supabase tidak akan terhapus.'))return;setBusy(true);setMessage('');try{await clearCachedMessages();setMessage('Cache pesan lokal berhasil dihapus.')}catch{setMessage('Cache pesan lokal gagal dihapus.')}finally{setBusy(false)}};
  return <div className="offline-cache-control"><button type="button" onClick={()=>void clear()} disabled={busy}><Trash2 size={15}/>{busy?'Menghapus cache…':'Hapus cache offline'}</button>{message&&<small role="status">{message}</small>}</div>;
}
