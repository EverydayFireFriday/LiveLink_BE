import { Request, Response } from 'express';
import { getDb } from '../../utils/db';
import { ObjectId } from 'mongodb';
import { ChatRoom, ChatRoomCreateInput, ChatRoomUpdateInput, Message } from '../../models/chat';

export class ChatController {
  
  // 채팅방 생성
  async createChatRoom(req: Request, res: Response) {
    try {
      const userId = req.user?.userId;
      if (!userId) {
        return res.status(401).json({ message: 'Authentication required' });
      }

      const { name, description, type, relatedId, isPrivate, maxParticipants }: ChatRoomCreateInput = req.body;

      if (!name || !type) {
        return res.status(400).json({ message: 'Name and type are required' });
      }

      const db = getDb();
      const userObjectId = new ObjectId(userId);

      const chatRoom: ChatRoom = {
        name,
        description,
        type,
        relatedId: relatedId ? new ObjectId(relatedId) : undefined,
        participants: [userObjectId],
        admins: [userObjectId],
        createdBy: userObjectId,
        createdAt: new Date(),
        updatedAt: new Date(),
        isActive: true,
        maxParticipants,
        isPrivate: isPrivate || false,
        lastMessageAt: new Date()
      };

      const result = await db.collection('chatRooms').insertOne(chatRoom);

      res.status(201).json({
        message: 'Chat room created successfully',
        chatRoom: { ...chatRoom, _id: result.insertedId }
      });

    } catch (error) {
      console.error('Create chat room error:', error);
      res.status(500).json({ message: 'Internal server error' });
    }
  }

  // 채팅방 목록 조회
  async getChatRooms(req: Request, res: Response) {
    try {
      const userId = req.user?.userId;
      if (!userId) {
        return res.status(401).json({ message: 'Authentication required' });
      }

      const db = getDb();
      const userObjectId = new ObjectId(userId);

      const { page = 1, limit = 20, type } = req.query;
      const skip = (Number(page) - 1) * Number(limit);

      const query: any = {
        participants: userObjectId,
        isActive: true
      };

      if (type) {
        query.type = type;
      }

      const chatRooms = await db.collection('chatRooms')
        .find(query)
        .sort({ lastMessageAt: -1 })
        .skip(skip)
        .limit(Number(limit))
        .toArray();

      const total = await db.collection('chatRooms').countDocuments(query);

      res.json({
        chatRooms,
        pagination: {
          page: Number(page),
          limit: Number(limit),
          total,
          pages: Math.ceil(total / Number(limit))
        }
      });

    } catch (error) {
      console.error('Get chat rooms error:', error);
      res.status(500).json({ message: 'Internal server error' });
    }
  }

  // 특정 채팅방 조회
  async getChatRoom(req: Request, res: Response) {
    try {
      const userId = req.user?.userId;
      const { roomId } = req.params;

      if (!userId) {
        return res.status(401).json({ message: 'Authentication required' });
      }

      if (!ObjectId.isValid(roomId)) {
        return res.status(400).json({ message: 'Invalid room ID' });
      }

      const db = getDb();
      const userObjectId = new ObjectId(userId);
      const roomObjectId = new ObjectId(roomId);

      const chatRoom = await db.collection('chatRooms').findOne({
        _id: roomObjectId,
        participants: userObjectId,
        isActive: true
      });

      if (!chatRoom) {
        return res.status(404).json({ message: 'Chat room not found' });
      }

      // 참가자 정보 조회
      const participants = await db.collection('users')
        .find({ _id: { $in: chatRoom.participants } })
        .project({ name: 1, email: 1, _id: 1 })
        .toArray();

      res.json({
        ...chatRoom,
        participantDetails: participants
      });

    } catch (error) {
      console.error('Get chat room error:', error);
      res.status(500).json({ message: 'Internal server error' });
    }
  }

  // 채팅방 참가
  async joinChatRoom(req: Request, res: Response) {
    try {
      const userId = req.user?.userId;
      const { roomId } = req.params;

      if (!userId) {
        return res.status(401).json({ message: 'Authentication required' });
      }

      if (!ObjectId.isValid(roomId)) {
        return res.status(400).json({ message: 'Invalid room ID' });
      }

      const db = getDb();
      const userObjectId = new ObjectId(userId);
      const roomObjectId = new ObjectId(roomId);

      const chatRoom = await db.collection('chatRooms').findOne({
        _id: roomObjectId,
        isActive: true
      });

      if (!chatRoom) {
        return res.status(404).json({ message: 'Chat room not found' });
      }

      // 이미 참가중인지 확인
      if (chatRoom.participants.some((p: ObjectId) => p.equals(userObjectId))) {
        return res.status(400).json({ message: 'Already joined this room' });
      }

      // 최대 참가자 수 확인
      if (chatRoom.maxParticipants && chatRoom.participants.length >= chatRoom.maxParticipants) {
        return res.status(400).json({ message: 'Room is full' });
      }

      // 참가자 추가
      await db.collection('chatRooms').updateOne(
        { _id: roomObjectId },
        { 
          $addToSet: { participants: userObjectId },
          $set: { updatedAt: new Date() }
        }
      );

      res.json({ message: 'Successfully joined chat room' });

    } catch (error) {
      console.error('Join chat room error:', error);
      res.status(500).json({ message: 'Internal server error' });
    }
  }

  // 채팅방 나가기
  async leaveChatRoom(req: Request, res: Response) {
    try {
      const userId = req.user?.userId;
      const { roomId } = req.params;

      if (!userId) {
        return res.status(401).json({ message: 'Authentication required' });
      }

      if (!ObjectId.isValid(roomId)) {
        return res.status(400).json({ message: 'Invalid room ID' });
      }

      const db = getDb();
      const userObjectId = new ObjectId(userId);
      const roomObjectId = new ObjectId(roomId);

      const chatRoom = await db.collection('chatRooms').findOne({
        _id: roomObjectId,
        participants: userObjectId,
        isActive: true
      });

      if (!chatRoom) {
        return res.status(404).json({ message: 'Chat room not found' });
      }

      // 참가자에서 제거
      await db.collection('chatRooms').updateOne(
        { _id: roomObjectId },
        { 
          $pull: { participants: userObjectId, admins: userObjectId },
          $set: { updatedAt: new Date() }
        }
      );

      res.json({ message: 'Successfully left chat room' });

    } catch (error) {
      console.error('Leave chat room error:', error);
      res.status(500).json({ message: 'Internal server error' });
    }
  }

  // 채팅 메시지 조회
  async getChatMessages(req: Request, res: Response) {
    try {
      const userId = req.user?.userId;
      const { roomId } = req.params;

      if (!userId) {
        return res.status(401).json({ message: 'Authentication required' });
      }

      if (!ObjectId.isValid(roomId)) {
        return res.status(400).json({ message: 'Invalid room ID' });
      }

      const db = getDb();
      const userObjectId = new ObjectId(userId);
      const roomObjectId = new ObjectId(roomId);

      // 채팅방 접근 권한 확인
      const chatRoom = await db.collection('chatRooms').findOne({
        _id: roomObjectId,
        participants: userObjectId,
        isActive: true
      });

      if (!chatRoom) {
        return res.status(404).json({ message: 'Chat room not found' });
      }

      const { page = 1, limit = 50, before } = req.query;
      const skip = (Number(page) - 1) * Number(limit);

      const query: any = { chatRoomId: roomObjectId };
      
      if (before) {
        query.timestamp = { $lt: new Date(before as string) };
      }

      const messages = await db.collection('messages')
        .find(query)
        .sort({ timestamp: -1 })
        .skip(skip)
        .limit(Number(limit))
        .toArray();

      const total = await db.collection('messages').countDocuments({ chatRoomId: roomObjectId });

      res.json({
        messages: messages.reverse(),
        pagination: {
          page: Number(page),
          limit: Number(limit),
          total,
          pages: Math.ceil(total / Number(limit))
        }
      });

    } catch (error) {
      console.error('Get chat messages error:', error);
      res.status(500).json({ message: 'Internal server error' });
    }
  }

  // 채팅방 설정 업데이트
  async updateChatRoom(req: Request, res: Response) {
    try {
      const userId = req.user?.userId;
      const { roomId } = req.params;

      if (!userId) {
        return res.status(401).json({ message: 'Authentication required' });
      }

      if (!ObjectId.isValid(roomId)) {
        return res.status(400).json({ message: 'Invalid room ID' });
      }

      const db = getDb();
      const userObjectId = new ObjectId(userId);
      const roomObjectId = new ObjectId(roomId);

      // 관리자 권한 확인
      const chatRoom = await db.collection('chatRooms').findOne({
        _id: roomObjectId,
        admins: userObjectId,
        isActive: true
      });

      if (!chatRoom) {
        return res.status(404).json({ message: 'Chat room not found or access denied' });
      }

      const { name, description, isPrivate, maxParticipants }: ChatRoomUpdateInput = req.body;

      const updateData: any = {
        updatedAt: new Date()
      };

      if (name) updateData.name = name;
      if (description !== undefined) updateData.description = description;
      if (isPrivate !== undefined) updateData.isPrivate = isPrivate;
      if (maxParticipants !== undefined) updateData.maxParticipants = maxParticipants;

      await db.collection('chatRooms').updateOne(
        { _id: roomObjectId },
        { $set: updateData }
      );

      res.json({ message: 'Chat room updated successfully' });

    } catch (error) {
      console.error('Update chat room error:', error);
      res.status(500).json({ message: 'Internal server error' });
    }
  }

  // 채팅방 삭제
  async deleteChatRoom(req: Request, res: Response) {
    try {
      const userId = req.user?.userId;
      const { roomId } = req.params;

      if (!userId) {
        return res.status(401).json({ message: 'Authentication required' });
      }

      if (!ObjectId.isValid(roomId)) {
        return res.status(400).json({ message: 'Invalid room ID' });
      }

      const db = getDb();
      const userObjectId = new ObjectId(userId);
      const roomObjectId = new ObjectId(roomId);

      // 생성자 또는 관리자 권한 확인
      const chatRoom = await db.collection('chatRooms').findOne({
        _id: roomObjectId,
        $or: [
          { createdBy: userObjectId },
          { admins: userObjectId }
        ],
        isActive: true
      });

      if (!chatRoom) {
        return res.status(404).json({ message: 'Chat room not found or access denied' });
      }

      // 소프트 삭제 (실제 데이터는 보존)
      await db.collection('chatRooms').updateOne(
        { _id: roomObjectId },
        { 
          $set: { 
            isActive: false,
            updatedAt: new Date()
          }
        }
      );

      res.json({ message: 'Chat room deleted successfully' });

    } catch (error) {
      console.error('Delete chat room error:', error);
      res.status(500).json({ message: 'Internal server error' });
    }
  }
}