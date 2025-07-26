import express from 'express';
import { ChatController } from '../../controllers/chat/chatController';
import { requireAuth } from '../../middlewares/auth/authMiddleware';

const router = express.Router();
const chatController = new ChatController();

/**
 * @swagger
 * tags:
 *   name: Chat
 *   description: 채팅 관리 API
 */

/**
 * @swagger
 * /chat/rooms:
 *   post:
 *     summary: 채팅방 생성
 *     tags: [Chat]
 *     security:
 *       - sessionAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - name
 *               - isPrivate
 *             properties:
 *               name:
 *                 type: string
 *                 example: "일반 채팅방"
 *               description:
 *                 type: string
 *                 example: "자유롭게 대화할 수 있는 공간입니다."
 *               isPrivate:
 *                 type: boolean
 *                 example: false
 *     responses:
 *       201:
 *         description: 채팅방 생성 성공
 *       401:
 *         description: 인증 필요
 */
router.post('/rooms', requireAuth, chatController.createChatRoom);

/**
 * @swagger
 * /chat/rooms:
 *   get:
 *     summary: 사용자 참여 채팅방 목록
 *     tags: [Chat]
 *     security:
 *       - sessionAuth: []
 *     responses:
 *       200:
 *         description: 채팅방 목록 조회 성공
 *       401:
 *         description: 인증 필요
 */
router.get('/rooms', requireAuth, chatController.getUserChatRooms);

/**
 * @swagger
 * /chat/rooms/public:
 *   get:
 *     summary: 공개 채팅방 목록
 *     tags: [Chat]
 *     parameters:
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 20
 *         description: 조회할 채팅방 수
 *       - in: query
 *         name: skip
 *         schema:
 *           type: integer
 *           default: 0
 *         description: 건너뛸 채팅방 수
 *     responses:
 *       200:
 *         description: 공개 채팅방 목록 조회 성공
 */
router.get('/rooms/public', chatController.getPublicChatRooms);

router.get('/rooms/search', chatController.searchChatRooms);
router.get('/rooms/:roomId', requireAuth, chatController.getChatRoom);
router.post('/rooms/:roomId/join', requireAuth, chatController.joinChatRoom);
router.post('/rooms/:roomId/leave', requireAuth, chatController.leaveChatRoom);
router.get('/rooms/:roomId/messages', requireAuth, chatController.getChatRoomMessages);
router.get('/rooms/:roomId/messages/search', requireAuth, chatController.searchMessages);
router.put('/messages/:messageId', requireAuth, chatController.updateMessage);
router.delete('/messages/:messageId', requireAuth, chatController.deleteMessage);

export default router;