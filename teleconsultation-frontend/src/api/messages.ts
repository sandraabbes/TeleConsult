import api from './axios'

export interface MessageEntity {
  id: string
  conversationId: string
  senderId: string
  senderType: 'DOCTOR' | 'PATIENT' | 'doctor' | 'patient'
  text: string
  isRead: boolean
  createdAt: string
}

export interface ConversationEntity {
  id: string
  doctorId: string
  patientId: string
  lastMessageAt: string
  createdAt: string
  messages?: MessageEntity[]
}

const BASE_PATH = '/messages/conversations'

export const messagesApi = {
  getConversations: async (userId: string, userType: 'doctor' | 'patient' | 'DOCTOR' | 'PATIENT') => {
    const response = await api.get<ConversationEntity[]>(BASE_PATH, {
      params: { userId, userType: userType.toLowerCase() },
    })
    return response.data
  },

  getHistory: async (conversationId: string) => {
    const response = await api.get<MessageEntity[]>(`${BASE_PATH}/${conversationId}`)
    return response.data
  },

  markAsRead: async (conversationId: string, userId: string) => {
    const response = await api.patch(`${BASE_PATH}/${conversationId}/read`, { userId })
    return response.data
  },

  createConversation: async (doctorId: string, patientId: string) => {
    const response = await api.post<ConversationEntity>(BASE_PATH, { doctorId, patientId })
    return response.data
  }
}
