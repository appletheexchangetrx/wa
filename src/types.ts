export type MessageRow = {
  id: string
  wamid: string | null
  direction: 'inbound' | 'outbound'
  from_phone: string
  recipient_phone: string | null
  profile_name: string | null
  phone_number_id: string | null
  display_phone_number: string | null
  message_type: string | null
  text_body: string | null
  status: string | null
  error_details: unknown
  message_timestamp: string | null
  created_at: string
}

export type Conversation = {
  phone: string
  name: string
  lastMessage: MessageRow
  messages: MessageRow[]
  unread: number
}
