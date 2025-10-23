import { ObjectId } from 'mongodb';
import { MessageModel, Message } from '../../models/chat/message';
import { ChatRoomModel } from '../../models/chat/chatRoom';
import { UserModel } from '../../models/auth/user';
import { MessageCreateRequest, MessageResponse } from '../../types/chat';

export class MessageService {
  private messageModel: MessageModel;
  private chatRoomModel: ChatRoomModel;
  private userModel: UserModel;

  constructor() {
    this.messageModel = new MessageModel();
    this.chatRoomModel = new ChatRoomModel();
    this.userModel = new UserModel();
  }

  async createMessage(
    chatRoomId: string,
    senderId: string,
    messageData: MessageCreateRequest,
  ): Promise<MessageResponse> {
    const chatRoom = await this.chatRoomModel.findById(chatRoomId);
    if (!chatRoom) throw new Error('채팅방을 찾을 수 없습니다.');

    const senderObjectId = new ObjectId(senderId);
    const isParticipant = chatRoom.participants.some((p) =>
      p.equals(senderObjectId),
    );
    if (!isParticipant) throw new Error('채팅방에 참여하지 않은 사용자입니다.');

    if (messageData.replyToMessageId) {
      const replyToMessage = await this.messageModel.findById(
        messageData.replyToMessageId,
      );
      if (
        !replyToMessage ||
        !replyToMessage.chatRoomId.equals(new ObjectId(chatRoomId))
      ) {
        throw new Error('답글 대상 메시지를 찾을 수 없습니다.');
      }
    }

    const message = await this.messageModel.createMessage({
      chatRoomId: new ObjectId(chatRoomId),
      senderId: senderObjectId,
      content: messageData.content,
      messageType: messageData.messageType || 'text',
      replyToMessageId: messageData.replyToMessageId
        ? new ObjectId(messageData.replyToMessageId)
        : undefined,
    });

    await this.chatRoomModel.updateLastActivity(chatRoomId);
    return await this.transformMessageToResponse(message);
  }

  async getChatRoomMessages(
    chatRoomId: string,
    userId: string,
    limit: number = 50,
    skip: number = 0,
  ): Promise<MessageResponse[]> {
    const chatRoom = await this.chatRoomModel.findById(chatRoomId);
    if (!chatRoom) throw new Error('채팅방을 찾을 수 없습니다.');

    const userObjectId = new ObjectId(userId);
    const isParticipant = chatRoom.participants.some((p) =>
      p.equals(userObjectId),
    );
    if (!isParticipant) throw new Error('채팅방에 참여하지 않은 사용자입니다.');

    const messages = await this.messageModel.findByChatRoom(
      chatRoomId,
      limit,
      skip,
    );

    const messageResponses = await Promise.all(
      messages.map((message) => this.transformMessageToResponse(message)),
    );

    return messageResponses.reverse();
  }

  async updateMessage(
    messageId: string,
    userId: string,
    content: string,
  ): Promise<MessageResponse | null> {
    const message = await this.messageModel.findById(messageId);
    if (!message) throw new Error('메시지를 찾을 수 없습니다.');

    if (!message.senderId.equals(new ObjectId(userId))) {
      throw new Error('메시지를 수정할 권한이 없습니다.');
    }

    const updatedMessage = await this.messageModel.updateMessage(
      messageId,
      content,
    );
    if (!updatedMessage) return null;

    return await this.transformMessageToResponse(updatedMessage);
  }

  async deleteMessage(messageId: string, userId: string): Promise<boolean> {
    const message = await this.messageModel.findById(messageId);
    if (!message) throw new Error('메시지를 찾을 수 없습니다.');

    if (!message.senderId.equals(new ObjectId(userId))) {
      throw new Error('메시지를 삭제할 권한이 없습니다.');
    }

    return await this.messageModel.deleteMessage(messageId);
  }

  async searchMessages(
    chatRoomId: string,
    userId: string,
    searchTerm: string,
    limit: number = 20,
  ): Promise<MessageResponse[]> {
    const chatRoom = await this.chatRoomModel.findById(chatRoomId);
    if (!chatRoom) throw new Error('채팅방을 찾을 수 없습니다.');

    const userObjectId = new ObjectId(userId);
    const isParticipant = chatRoom.participants.some((p) =>
      p.equals(userObjectId),
    );
    if (!isParticipant) throw new Error('채팅방에 참여하지 않은 사용자입니다.');

    const messages = await this.messageModel.searchMessages(
      chatRoomId,
      searchTerm,
      limit,
    );

    return await Promise.all(
      messages.map((message) => this.transformMessageToResponse(message)),
    );
  }

  private async transformMessageToResponse(
    message: Message,
  ): Promise<MessageResponse> {
    const sender = await this.userModel.findById(message.senderId);

    return {
      _id: message._id!.toString(),
      chatRoomId: message.chatRoomId.toString(),
      senderId: message.senderId.toString(),
      senderUsername: sender?.username || 'Unknown',
      content: message.content,
      messageType: message.messageType,
      isEdited: message.isEdited,
      editedAt: message.editedAt?.toISOString(),
      replyToMessageId: message.replyToMessageId?.toString(),
      createdAt: message.createdAt.toISOString(),
      updatedAt: message.updatedAt.toISOString(),
    };
  }
}
