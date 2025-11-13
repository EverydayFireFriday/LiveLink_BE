import express from 'express';
import { ChatRoomService } from '../../services/chat/chatRoomService';
import { MessageService } from '../../services/chat/messageService';
import { ChatRoomCreateRequest } from '../../types/chat';
import { ResponseBuilder } from '../../utils/response/apiResponse';
import { ErrorCodes } from '../../utils/errors/errorCodes';
import {
  AppError,
  UnauthorizedError,
  NotFoundError,
  BadRequestError,
  InternalServerError,
} from '../../utils/errors/customErrors';

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
        throw new UnauthorizedError(undefined, ErrorCodes.AUTH_UNAUTHORIZED);
      }

      const roomData: ChatRoomCreateRequest = req.body;
      const chatRoom = await this.chatRoomService.createChatRoom(
        userId,
        roomData,
      );

      return ResponseBuilder.created(res, '채팅방이 생성되었습니다.', chatRoom);
    } catch (error) {
      if (error instanceof AppError) {
        throw error;
      }
      throw new InternalServerError(
        error instanceof Error ? error.message : undefined,
        ErrorCodes.SYS_INTERNAL_ERROR,
      );
    }
  };

  getUserChatRooms = async (req: express.Request, res: express.Response) => {
    try {
      const userId = req.session.user?.userId;
      if (!userId) {
        throw new UnauthorizedError(undefined, ErrorCodes.AUTH_UNAUTHORIZED);
      }

      const chatRooms = await this.chatRoomService.getUserChatRooms(userId);

      return ResponseBuilder.success(
        res,
        '채팅방 목록을 조회했습니다.',
        chatRooms,
      );
    } catch (error) {
      if (error instanceof AppError) {
        throw error;
      }
      throw new InternalServerError(
        error instanceof Error ? error.message : undefined,
        ErrorCodes.SYS_INTERNAL_ERROR,
      );
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

      return ResponseBuilder.success(
        res,
        '공개 채팅방 목록을 조회했습니다.',
        chatRooms,
      );
    } catch (error) {
      if (error instanceof AppError) {
        throw error;
      }
      throw new InternalServerError(
        error instanceof Error ? error.message : undefined,
        ErrorCodes.SYS_INTERNAL_ERROR,
      );
    }
  };

  getChatRoom = async (req: express.Request, res: express.Response) => {
    try {
      const userId = req.session.user?.userId;
      if (!userId) {
        throw new UnauthorizedError(undefined, ErrorCodes.AUTH_UNAUTHORIZED);
      }

      const { roomId } = req.params;
      const chatRoom = await this.chatRoomService.getChatRoom(roomId, userId);

      if (!chatRoom) {
        throw new NotFoundError(undefined, ErrorCodes.CHAT_ROOM_NOT_FOUND);
      }

      return ResponseBuilder.success(
        res,
        '채팅방 정보를 조회했습니다.',
        chatRoom,
      );
    } catch (error) {
      if (error instanceof AppError) {
        throw error;
      }
      throw new InternalServerError(
        error instanceof Error ? error.message : undefined,
        ErrorCodes.SYS_INTERNAL_ERROR,
      );
    }
  };

  joinChatRoom = async (req: express.Request, res: express.Response) => {
    try {
      const userId = req.session.user?.userId;
      if (!userId) {
        throw new UnauthorizedError(undefined, ErrorCodes.AUTH_UNAUTHORIZED);
      }

      const { roomId } = req.params;
      const chatRoom = await this.chatRoomService.joinChatRoom(roomId, userId);

      return ResponseBuilder.success(res, '채팅방에 참여했습니다.', chatRoom);
    } catch (error) {
      if (error instanceof AppError) {
        throw error;
      }
      throw new InternalServerError(
        error instanceof Error ? error.message : undefined,
        ErrorCodes.SYS_INTERNAL_ERROR,
      );
    }
  };

  leaveChatRoom = async (req: express.Request, res: express.Response) => {
    try {
      const userId = req.session.user?.userId;
      if (!userId) {
        throw new UnauthorizedError(undefined, ErrorCodes.AUTH_UNAUTHORIZED);
      }

      const { roomId } = req.params;
      const success = await this.chatRoomService.leaveChatRoom(roomId, userId);

      if (success) {
        return ResponseBuilder.success(res, '채팅방을 떠났습니다.');
      } else {
        throw new BadRequestError(
          '채팅방 떠나기에 실패했습니다.',
          ErrorCodes.CHAT_NOT_JOINED,
        );
      }
    } catch (error) {
      if (error instanceof AppError) {
        throw error;
      }
      throw new InternalServerError(
        error instanceof Error ? error.message : undefined,
        ErrorCodes.SYS_INTERNAL_ERROR,
      );
    }
  };

  getChatRoomMessages = async (req: express.Request, res: express.Response) => {
    try {
      const userId = req.session.user?.userId;
      if (!userId) {
        throw new UnauthorizedError(undefined, ErrorCodes.AUTH_UNAUTHORIZED);
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

      return ResponseBuilder.success(
        res,
        '메시지 목록을 조회했습니다.',
        messages,
      );
    } catch (error) {
      if (error instanceof AppError) {
        throw error;
      }
      throw new InternalServerError(
        error instanceof Error ? error.message : undefined,
        ErrorCodes.SYS_INTERNAL_ERROR,
      );
    }
  };

  updateMessage = async (req: express.Request, res: express.Response) => {
    try {
      const userId = req.session.user?.userId;
      if (!userId) {
        throw new UnauthorizedError(undefined, ErrorCodes.AUTH_UNAUTHORIZED);
      }

      const { messageId } = req.params;
      const { content } = req.body;

      const message = await this.messageService.updateMessage(
        messageId,
        userId,
        content,
      );

      if (!message) {
        throw new NotFoundError(undefined, ErrorCodes.CHAT_MESSAGE_NOT_FOUND);
      }

      return ResponseBuilder.success(res, '메시지가 수정되었습니다.', message);
    } catch (error) {
      if (error instanceof AppError) {
        throw error;
      }
      throw new InternalServerError(
        error instanceof Error ? error.message : undefined,
        ErrorCodes.SYS_INTERNAL_ERROR,
      );
    }
  };

  deleteMessage = async (req: express.Request, res: express.Response) => {
    try {
      const userId = req.session.user?.userId;
      if (!userId) {
        throw new UnauthorizedError(undefined, ErrorCodes.AUTH_UNAUTHORIZED);
      }

      const { messageId } = req.params;
      const success = await this.messageService.deleteMessage(
        messageId,
        userId,
      );

      if (success) {
        return ResponseBuilder.success(res, '메시지가 삭제되었습니다.');
      } else {
        throw new NotFoundError(undefined, ErrorCodes.CHAT_MESSAGE_NOT_FOUND);
      }
    } catch (error) {
      if (error instanceof AppError) {
        throw error;
      }
      throw new InternalServerError(
        error instanceof Error ? error.message : undefined,
        ErrorCodes.SYS_INTERNAL_ERROR,
      );
    }
  };

  searchChatRooms = async (req: express.Request, res: express.Response) => {
    try {
      const { q: searchTerm } = req.query;
      const limit = parseInt(req.query.limit as string) || 20;

      if (!searchTerm || typeof searchTerm !== 'string') {
        throw new BadRequestError(undefined, ErrorCodes.VAL_MISSING_FIELD);
      }

      const chatRooms = await this.chatRoomService.searchChatRooms(
        searchTerm,
        limit,
      );

      return ResponseBuilder.success(res, '채팅방 검색 결과입니다.', chatRooms);
    } catch (error) {
      if (error instanceof AppError) {
        throw error;
      }
      throw new InternalServerError(
        error instanceof Error ? error.message : undefined,
        ErrorCodes.SYS_INTERNAL_ERROR,
      );
    }
  };

  searchMessages = async (req: express.Request, res: express.Response) => {
    try {
      const userId = req.session.user?.userId;
      if (!userId) {
        throw new UnauthorizedError(undefined, ErrorCodes.AUTH_UNAUTHORIZED);
      }

      const { roomId } = req.params;
      const { q: searchTerm } = req.query;
      const limit = parseInt(req.query.limit as string) || 20;

      if (!searchTerm || typeof searchTerm !== 'string') {
        throw new BadRequestError(undefined, ErrorCodes.VAL_MISSING_FIELD);
      }

      const messages = await this.messageService.searchMessages(
        roomId,
        userId,
        searchTerm,
        limit,
      );

      return ResponseBuilder.success(res, '메시지 검색 결과입니다.', messages);
    } catch (error) {
      if (error instanceof AppError) {
        throw error;
      }
      throw new InternalServerError(
        error instanceof Error ? error.message : undefined,
        ErrorCodes.SYS_INTERNAL_ERROR,
      );
    }
  };
}
