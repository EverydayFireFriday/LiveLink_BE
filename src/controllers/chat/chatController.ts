import express from 'express';
import { ChatRoomService } from '../../services/chat/chatRoomService';
import { MessageService } from '../../services/chat/messageService';
import { ChatRoomCreateRequest } from '../../types/chat';

export class ChatController {
  private chatRoomService: ChatRoomService;
  private messageService: MessageService;

  constructor() {
    this.chatRoomService = new ChatRoomService();
    this.messageService = new MessageService();
  }

  createChatRoom = async (req: express.Request, res: express.Response) => {
    try {
      const userId = req.session.user?.userId;
      if (!userId) {
        return res.status(401).json({ message: '로그인이 필요합니다.' });
      }

      const roomData: ChatRoomCreateRequest = req.body;
      const chatRoom = await this.chatRoomService.createChatRoom(
        userId,
        roomData,
      );

      res.status(201).json({
        message: '채팅방이 생성되었습니다.',
        data: chatRoom,
      });
    } catch (error) {
      const errorMessage =
        error instanceof Error
          ? error.message
          : '알 수 없는 오류가 발생했습니다.';
      res.status(500).json({ message: errorMessage });
    }
  };

  getUserChatRooms = async (req: express.Request, res: express.Response) => {
    try {
      const userId = req.session.user?.userId;
      if (!userId) {
        return res.status(401).json({ message: '로그인이 필요합니다.' });
      }

      const chatRooms = await this.chatRoomService.getUserChatRooms(userId);

      res.json({
        message: '채팅방 목록을 조회했습니다.',
        data: chatRooms,
      });
    } catch (error) {
      const errorMessage =
        error instanceof Error
          ? error.message
          : '알 수 없는 오류가 발생했습니다.';
      res.status(500).json({ message: errorMessage });
    }
  };

  getPublicChatRooms = async (req: express.Request, res: express.Response) => {
    try {
      const limit = parseInt(req.query.limit as string) || 20;
      const skip = parseInt(req.query.skip as string) || 0;

      const chatRooms = await this.chatRoomService.getPublicChatRooms(
        limit,
        skip,
      );

      res.json({
        message: '공개 채팅방 목록을 조회했습니다.',
        data: chatRooms,
      });
    } catch (error) {
      const errorMessage =
        error instanceof Error
          ? error.message
          : '알 수 없는 오류가 발생했습니다.';
      res.status(500).json({ message: errorMessage });
    }
  };

  getChatRoom = async (req: express.Request, res: express.Response) => {
    try {
      const userId = req.session.user?.userId;
      if (!userId) {
        return res.status(401).json({ message: '로그인이 필요합니다.' });
      }

      const { roomId } = req.params;
      const chatRoom = await this.chatRoomService.getChatRoom(roomId, userId);

      if (!chatRoom) {
        return res.status(404).json({ message: '채팅방을 찾을 수 없습니다.' });
      }

      res.json({
        message: '채팅방 정보를 조회했습니다.',
        data: chatRoom,
      });
    } catch (error) {
      const errorMessage =
        error instanceof Error
          ? error.message
          : '알 수 없는 오류가 발생했습니다.';
      res.status(403).json({ message: errorMessage });
    }
  };

  joinChatRoom = async (req: express.Request, res: express.Response) => {
    try {
      const userId = req.session.user?.userId;
      if (!userId) {
        return res.status(401).json({ message: '로그인이 필요합니다.' });
      }

      const { roomId } = req.params;
      const chatRoom = await this.chatRoomService.joinChatRoom(roomId, userId);

      res.json({
        message: '채팅방에 참여했습니다.',
        data: chatRoom,
      });
    } catch (error) {
      const errorMessage =
        error instanceof Error
          ? error.message
          : '알 수 없는 오류가 발생했습니다.';
      res.status(400).json({ message: errorMessage });
    }
  };

  leaveChatRoom = async (req: express.Request, res: express.Response) => {
    try {
      const userId = req.session.user?.userId;
      if (!userId) {
        return res.status(401).json({ message: '로그인이 필요합니다.' });
      }

      const { roomId } = req.params;
      const success = await this.chatRoomService.leaveChatRoom(roomId, userId);

      if (success) {
        res.json({ message: '채팅방을 떠났습니다.' });
      } else {
        res.status(400).json({ message: '채팅방 떠나기에 실패했습니다.' });
      }
    } catch (error) {
      const errorMessage =
        error instanceof Error
          ? error.message
          : '알 수 없는 오류가 발생했습니다.';
      res.status(500).json({ message: errorMessage });
    }
  };

  getChatRoomMessages = async (req: express.Request, res: express.Response) => {
    try {
      const userId = req.session.user?.userId;
      if (!userId) {
        return res.status(401).json({ message: '로그인이 필요합니다.' });
      }

      const { roomId } = req.params;
      const limit = parseInt(req.query.limit as string) || 50;
      const skip = parseInt(req.query.skip as string) || 0;

      const messages = await this.messageService.getChatRoomMessages(
        roomId,
        userId,
        limit,
        skip,
      );

      res.json({
        message: '메시지 목록을 조회했습니다.',
        data: messages,
      });
    } catch (error) {
      const errorMessage =
        error instanceof Error
          ? error.message
          : '알 수 없는 오류가 발생했습니다.';
      res.status(403).json({ message: errorMessage });
    }
  };

  updateMessage = async (req: express.Request, res: express.Response) => {
    try {
      const userId = req.session.user?.userId;
      if (!userId) {
        return res.status(401).json({ message: '로그인이 필요합니다.' });
      }

      const { messageId } = req.params;
      const { content } = req.body;

      const message = await this.messageService.updateMessage(
        messageId,
        userId,
        content,
      );

      if (!message) {
        return res.status(404).json({ message: '메시지를 찾을 수 없습니다.' });
      }

      res.json({
        message: '메시지가 수정되었습니다.',
        data: message,
      });
    } catch (error) {
      const errorMessage =
        error instanceof Error
          ? error.message
          : '알 수 없는 오류가 발생했습니다.';
      res.status(403).json({ message: errorMessage });
    }
  };

  deleteMessage = async (req: express.Request, res: express.Response) => {
    try {
      const userId = req.session.user?.userId;
      if (!userId) {
        return res.status(401).json({ message: '로그인이 필요합니다.' });
      }

      const { messageId } = req.params;
      const success = await this.messageService.deleteMessage(
        messageId,
        userId,
      );

      if (success) {
        res.json({ message: '메시지가 삭제되었습니다.' });
      } else {
        res.status(404).json({ message: '메시지를 찾을 수 없습니다.' });
      }
    } catch (error) {
      const errorMessage =
        error instanceof Error
          ? error.message
          : '알 수 없는 오류가 발생했습니다.';
      res.status(403).json({ message: errorMessage });
    }
  };

  searchChatRooms = async (req: express.Request, res: express.Response) => {
    try {
      const { q: searchTerm } = req.query;
      const limit = parseInt(req.query.limit as string) || 20;

      if (!searchTerm || typeof searchTerm !== 'string') {
        return res.status(400).json({ message: '검색어가 필요합니다.' });
      }

      const chatRooms = await this.chatRoomService.searchChatRooms(
        searchTerm,
        limit,
      );

      res.json({
        message: '채팅방 검색 결과입니다.',
        data: chatRooms,
      });
    } catch (error) {
      const errorMessage =
        error instanceof Error
          ? error.message
          : '알 수 없는 오류가 발생했습니다.';
      res.status(500).json({ message: errorMessage });
    }
  };

  searchMessages = async (req: express.Request, res: express.Response) => {
    try {
      const userId = req.session.user?.userId;
      if (!userId) {
        return res.status(401).json({ message: '로그인이 필요합니다.' });
      }

      const { roomId } = req.params;
      const { q: searchTerm } = req.query;
      const limit = parseInt(req.query.limit as string) || 20;

      if (!searchTerm || typeof searchTerm !== 'string') {
        return res.status(400).json({ message: '검색어가 필요합니다.' });
      }

      const messages = await this.messageService.searchMessages(
        roomId,
        userId,
        searchTerm,
        limit,
      );

      res.json({
        message: '메시지 검색 결과입니다.',
        data: messages,
      });
    } catch (error) {
      const errorMessage =
        error instanceof Error
          ? error.message
          : '알 수 없는 오류가 발생했습니다.';
      res.status(403).json({ message: errorMessage });
    }
  };
}
