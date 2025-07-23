import { Router } from 'express';
import { ChatController } from '../../controllers/chat/chatController';
import { authenticateUser } from '../../middlewares/auth/authMiddleware';

const router = Router();
const chatController = new ChatController();

// 모든 채팅 라우트에 인증 미들웨어 적용
router.use(authenticateUser);

// 채팅방 CRUD
router.post('/rooms', chatController.createChatRoom.bind(chatController));
router.get('/rooms', chatController.getChatRooms.bind(chatController));
router.get('/rooms/:roomId', chatController.getChatRoom.bind(chatController));
router.put('/rooms/:roomId', chatController.updateChatRoom.bind(chatController));
router.delete('/rooms/:roomId', chatController.deleteChatRoom.bind(chatController));

// 채팅방 참가/나가기
router.post('/rooms/:roomId/join', chatController.joinChatRoom.bind(chatController));
router.post('/rooms/:roomId/leave', chatController.leaveChatRoom.bind(chatController));

// 메시지 조회
router.get('/rooms/:roomId/messages', chatController.getChatMessages.bind(chatController));

export default router;