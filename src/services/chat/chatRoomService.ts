import { ObjectId } from 'mongodb';
import { ChatRoomModel, ChatRoom } from '../../models/chat/chatRoom';
import { MessageModel } from '../../models/chat/message';
import { UserModel } from '../../models/auth/user';
import { ChatRoomCreateRequest, ChatRoomResponse, ChatRoomWithLastMessage } from '../../types/chat';

export class ChatRoomService {
  private chatRoomModel: ChatRoomModel;
  private messageModel: MessageModel;
  private userModel: UserModel;

  constructor() {
    this.chatRoomModel = new ChatRoomModel();
    this.messageModel = new MessageModel();
    this.userModel = new UserModel();
  }

  async createChatRoom(createdBy: string, roomData: ChatRoomCreateRequest): Promise<ChatRoomResponse> {
    const createdByObjectId = new ObjectId(createdBy);
    
    const chatRoom = await this.chatRoomModel.createChatRoom({
      ...roomData,
      participants: [createdByObjectId],
      createdBy: createdByObjectId,
    });

    return this.transformChatRoomToResponse(chatRoom);
  }

  async getChatRoom(roomId: string, userId: string): Promise<ChatRoomResponse | null> {
    const chatRoom = await this.chatRoomModel.findById(roomId);
    if (!chatRoom) return null;

    const userObjectId = new ObjectId(userId);
    const isParticipant = chatRoom.participants.some(p => p.equals(userObjectId));
    
    if (chatRoom.isPrivate && !isParticipant) {
      throw new Error('접근 권한이 없습니다.');
    }

    return this.transformChatRoomToResponse(chatRoom);
  }

  async getUserChatRooms(userId: string): Promise<ChatRoomWithLastMessage[]> {
    const chatRooms = await this.chatRoomModel.findByParticipant(userId);
    
    const roomsWithLastMessage = await Promise.all(
      chatRooms.map(async (room) => {
        const lastMessages = await this.messageModel.findByChatRoom(room._id!, 1, 0);
        const lastMessage = lastMessages[0];
        
        let lastMessageResponse = undefined;
        if (lastMessage) {
          const sender = await this.userModel.findById(lastMessage.senderId);
          lastMessageResponse = {
            _id: lastMessage._id!.toString(),
            chatRoomId: lastMessage.chatRoomId.toString(),
            senderId: lastMessage.senderId.toString(),
            senderUsername: sender?.username || 'Unknown',
            content: lastMessage.content,
            messageType: lastMessage.messageType,
            isEdited: lastMessage.isEdited,
            editedAt: lastMessage.editedAt?.toISOString(),
            replyToMessageId: lastMessage.replyToMessageId?.toString(),
            createdAt: lastMessage.createdAt.toISOString(),
            updatedAt: lastMessage.updatedAt.toISOString(),
          };
        }

        return {
          ...this.transformChatRoomToResponse(room),
          lastMessage: lastMessageResponse,
          unreadCount: 0,
        };
      })
    );

    return roomsWithLastMessage;
  }

  async joinChatRoom(roomId: string, userId: string): Promise<ChatRoomResponse | null> {
    const chatRoom = await this.chatRoomModel.findById(roomId);
    if (!chatRoom) throw new Error('채팅방을 찾을 수 없습니다.');

    if (chatRoom.isPrivate) {
      throw new Error('비공개 채팅방에는 초대를 통해서만 참여할 수 있습니다.');
    }

    const updatedRoom = await this.chatRoomModel.addParticipant(roomId, userId);
    return updatedRoom ? this.transformChatRoomToResponse(updatedRoom) : null;
  }

  async leaveChatRoom(roomId: string, userId: string): Promise<boolean> {
    const updatedRoom = await this.chatRoomModel.removeParticipant(roomId, userId);
    return !!updatedRoom;
  }

  async getPublicChatRooms(limit: number = 20, skip: number = 0): Promise<ChatRoomResponse[]> {
    const chatRooms = await this.chatRoomModel.findPublicRooms(limit, skip);
    return chatRooms.map(room => this.transformChatRoomToResponse(room));
  }

  async searchChatRooms(searchTerm: string, limit: number = 20): Promise<ChatRoomResponse[]> {
    const chatRooms = await this.chatRoomModel.searchRooms(searchTerm, limit);
    return chatRooms.map(room => this.transformChatRoomToResponse(room));
  }

  private transformChatRoomToResponse(chatRoom: ChatRoom): ChatRoomResponse {
    return {
      _id: chatRoom._id!.toString(),
      name: chatRoom.name,
      description: chatRoom.description,
      isPrivate: chatRoom.isPrivate,
      participants: chatRoom.participants.map(p => p.toString()),
      createdBy: chatRoom.createdBy.toString(),
      createdAt: chatRoom.createdAt.toISOString(),
      updatedAt: chatRoom.updatedAt.toISOString(),
      lastActivity: chatRoom.lastActivity.toISOString(),
      messageCount: chatRoom.messageCount,
    };
  }
}