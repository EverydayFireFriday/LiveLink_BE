import { Server, Socket } from 'socket.io';
import { getDb } from '../../utils/db';
import { ObjectId } from 'mongodb';
import { AuthenticatedSocket } from '../../middlewares/auth/socketAuthMiddleware';
import { Message, ChatRoom } from '../../models/chat';

export class ChatHandler {
  private io: Server;
  private socket: AuthenticatedSocket;

  constructor(io: Server, socket: Socket) {
    this.io = io;
    this.socket = socket as AuthenticatedSocket;
    this.setupEventListeners();
  }

  private setupEventListeners() {
    this.socket.on('join_room', this.handleJoinRoom.bind(this));
    this.socket.on('leave_room', this.handleLeaveRoom.bind(this));
    this.socket.on('send_message', this.handleSendMessage.bind(this));
    this.socket.on('mark_read', this.handleMarkRead.bind(this));
    this.socket.on('disconnect', this.handleDisconnect.bind(this));
  }

  private async handleJoinRoom(data: { roomId: string }) {
    try {
      const db = getDb();
      const roomId = new ObjectId(data.roomId);

      // 채팅방 존재 확인
      const room = await db.collection('chatRooms').findOne({ _id: roomId });
      if (!room) {
        return this.socket.emit('error', { message: 'Chat room not found' });
      }

      // 참가 권한 확인
      const userId = new ObjectId(this.socket.userId);
      if (!room.participants.some((p: ObjectId) => p.equals(userId))) {
        return this.socket.emit('error', { message: 'Access denied' });
      }

      // Socket.io 룸 참가
      await this.socket.join(data.roomId);
      
      // 최근 메시지 50개 조회
      const messages = await db.collection('messages')
        .find({ chatRoomId: roomId })
        .sort({ timestamp: -1 })
        .limit(50)
        .toArray();

      // 참가 알림
      this.socket.emit('joined_room', { 
        roomId: data.roomId,
        messages: messages.reverse()
      });

      // 다른 참가자들에게 알림
      this.socket.to(data.roomId).emit('user_joined', {
        userId: this.socket.userId,
        userName: this.socket.userName
      });

    } catch (error) {
      console.error('Join room error:', error);
      this.socket.emit('error', { message: 'Failed to join room' });
    }
  }

  private async handleLeaveRoom(data: { roomId: string }) {
    try {
      await this.socket.leave(data.roomId);
      
      this.socket.emit('left_room', { roomId: data.roomId });
      this.socket.to(data.roomId).emit('user_left', {
        userId: this.socket.userId,
        userName: this.socket.userName
      });

    } catch (error) {
      console.error('Leave room error:', error);
      this.socket.emit('error', { message: 'Failed to leave room' });
    }
  }

  private async handleSendMessage(data: { roomId: string; content: string; messageType?: string; replyTo?: string }) {
    try {
      const db = getDb();
      const roomId = new ObjectId(data.roomId);
      const userId = new ObjectId(this.socket.userId);

      // 채팅방 접근 권한 확인
      const room = await db.collection('chatRooms').findOne({ _id: roomId });
      if (!room || !room.participants.some((p: ObjectId) => p.equals(userId))) {
        return this.socket.emit('error', { message: 'Access denied' });
      }

      // 메시지 생성
      const message: Message = {
        chatRoomId: roomId,
        senderId: userId,
        senderName: this.socket.userName,
        senderEmail: this.socket.userEmail,
        content: data.content,
        messageType: (data.messageType as any) || 'text',
        timestamp: new Date(),
        readBy: [{
          userId: userId,
          readAt: new Date()
        }],
        edited: false,
        replyTo: data.replyTo ? new ObjectId(data.replyTo) : undefined
      };

      // 메시지 저장
      const result = await db.collection('messages').insertOne(message);

      // 채팅방 lastMessageAt 업데이트
      await db.collection('chatRooms').updateOne(
        { _id: roomId },
        { $set: { lastMessageAt: new Date() } }
      );

      // 실시간 브로드캐스트
      const messageWithId = { ...message, _id: result.insertedId };
      this.io.to(data.roomId).emit('new_message', messageWithId);

    } catch (error) {
      console.error('Send message error:', error);
      this.socket.emit('error', { message: 'Failed to send message' });
    }
  }

  private async handleMarkRead(data: { roomId: string; messageId: string }) {
    try {
      const db = getDb();
      const messageId = new ObjectId(data.messageId);
      const userId = new ObjectId(this.socket.userId);

      await db.collection('messages').updateOne(
        { _id: messageId },
        { 
          $addToSet: { 
            readBy: { 
              userId: userId, 
              readAt: new Date() 
            } 
          } 
        }
      );

      this.socket.to(data.roomId).emit('message_read', {
        messageId: data.messageId,
        userId: this.socket.userId
      });

    } catch (error) {
      console.error('Mark read error:', error);
    }
  }

  private async handleDisconnect() {
    console.log(`User ${this.socket.userName} disconnected`);
  }
}