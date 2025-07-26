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

/**
 * @swagger
 * /chat/rooms/search:
 *   get:
 *     summary: 채팅방 검색
 *     tags: [Chat]
 *     parameters:
 *       - in: query
 *         name: q
 *         required: true
 *         schema:
 *           type: string
 *         description: 검색할 채팅방 이름
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 20
 *         description: 조회할 채팅방 수
 *     responses:
 *       200:
 *         description: 채팅방 검색 성공
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: "채팅방 검색 결과입니다."
 *                 data:
 *                   type: array
 *                   items:
 *                     $ref: "#/components/schemas/ChatRoom"
 *       400:
 *         description: 검색어가 필요합니다
 *       500:
 *         description: 서버 오류
 */
router.get('/rooms/search', chatController.searchChatRooms);
/**
 * @swagger
 * /chat/rooms/{roomId}:
 *   get:
 *     summary: 채팅방 상세 정보
 *     tags: [Chat]
 *     security:
 *       - sessionAuth: []
 *     parameters:
 *       - in: path
 *         name: roomId
 *         required: true
 *         schema:
 *           type: string
 *         description: 채팅방 ID
 *     responses:
 *       200:
 *         description: 채팅방 상세 정보 조회 성공
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: "채팅방 정보를 조회했습니다."
 *                 data:
 *                   $ref: "#/components/schemas/ChatRoom"
 *       401:
 *         description: 인증 필요
 *       403:
 *         description: 접근 권한 없음
 *       404:
 *         description: 채팅방을 찾을 수 없음
 */
router.get('/rooms/:roomId', requireAuth, chatController.getChatRoom);
/**
 * @swagger
 * /chat/rooms/{roomId}/join:
 *   post:
 *     summary: 채팅방 참여
 *     tags: [Chat]
 *     security:
 *       - sessionAuth: []
 *     parameters:
 *       - in: path
 *         name: roomId
 *         required: true
 *         schema:
 *           type: string
 *         description: 참여할 채팅방 ID
 *     responses:
 *       200:
 *         description: 채팅방 참여 성공
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: "채팅방에 참여했습니다."
 *                 data:
 *                   $ref: "#/components/schemas/ChatRoom"
 *       400:
 *         description: 잘못된 요청 (이미 참여중이거나 기타 오류)
 *       401:
 *         description: 인증 필요
 */
router.post('/rooms/:roomId/join', requireAuth, chatController.joinChatRoom);
/**
 * @swagger
 * /chat/rooms/{roomId}/leave:
 *   post:
 *     summary: 채팅방 떠나기
 *     tags: [Chat]
 *     security:
 *       - sessionAuth: []
 *     parameters:
 *       - in: path
 *         name: roomId
 *         required: true
 *         schema:
 *           type: string
 *         description: 떠날 채팅방 ID
 *     responses:
 *       200:
 *         description: 채팅방 떠나기 성공
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: "채팅방을 떠났습니다."
 *       400:
 *         description: 채팅방 떠나기에 실패했습니다
 *       401:
 *         description: 인증 필요
 *       500:
 *         description: 서버 오류
 */
router.post('/rooms/:roomId/leave', requireAuth, chatController.leaveChatRoom);
/**
 * @swagger
 * /chat/rooms/{roomId}:
 *   get:
 *     summary: 채팅방 상세 정보
 *     tags: [Chat]
 *     security:
 *       - sessionAuth: []
 *     parameters:
 *       - in: path
 *         name: roomId
 *         required: true
 *         schema:
 *           type: string
 *         description: 채팅방 ID
 *     responses:
 *       200:
 *         description: 채팅방 상세 정보 조회 성공
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: "채팅방 정보를 조회했습니다."
 *                 data:
 *                   $ref: "#/components/schemas/ChatRoom"
 *       401:
 *         description: 인증 필요
 *       403:
 *         description: 접근 권한 없음
 *       404:
 *         description: 채팅방을 찾을 수 없음
 */
/**
 * @swagger
 * /chat/rooms/{roomId}/messages:
 *   get:
 *     summary: 채팅방 메시지 목록
 *     tags: [Chat]
 *     security:
 *       - sessionAuth: []
 *     parameters:
 *       - in: path
 *         name: roomId
 *         required: true
 *         schema:
 *           type: string
 *         description: 채팅방 ID
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 50
 *         description: 조회할 메시지 수
 *       - in: query
 *         name: skip
 *         schema:
 *           type: integer
 *           default: 0
 *         description: 건너뛸 메시지 수
 *     responses:
 *       200:
 *         description: 메시지 목록 조회 성공
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: "메시지 목록을 조회했습니다."
 *                 data:
 *                   type: array
 *                   items:
 *                     $ref: "#/components/schemas/Message"
 *       401:
 *         description: 인증 필요
 *       403:
 *         description: 접근 권한 없음
 */
router.get('/rooms/:roomId/messages', requireAuth, chatController.getChatRoomMessages);
/**
 * @swagger
 * /chat/rooms/{roomId}:
 *   get:
 *     summary: 채팅방 상세 정보
 *     tags: [Chat]
 *     security:
 *       - sessionAuth: []
 *     parameters:
 *       - in: path
 *         name: roomId
 *         required: true
 *         schema:
 *           type: string
 *         description: 채팅방 ID
 *     responses:
 *       200:
 *         description: 채팅방 상세 정보 조회 성공
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: "채팅방 정보를 조회했습니다."
 *                 data:
 *                   $ref: "#/components/schemas/ChatRoom"
 *       401:
 *         description: 인증 필요
 *       403:
 *         description: 접근 권한 없음
 *       404:
 *         description: 채팅방을 찾을 수 없음
 */
/**
 * @swagger
 * /chat/rooms/{roomId}/messages/search:
 *   get:
 *     summary: 채팅방 메시지 검색
 *     tags: [Chat]
 *     security:
 *       - sessionAuth: []
 *     parameters:
 *       - in: path
 *         name: roomId
 *         required: true
 *         schema:
 *           type: string
 *         description: 채팅방 ID
 *       - in: query
 *         name: q
 *         required: true
 *         schema:
 *           type: string
 *         description: 검색할 메시지 내용
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 20
 *         description: 조회할 메시지 수
 *     responses:
 *       200:
 *         description: 메시지 검색 성공
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: "메시지 검색 결과입니다."
 *                 data:
 *                   type: array
 *                   items:
 *                     $ref: "#/components/schemas/Message"
 *       400:
 *         description: 검색어가 필요합니다
 *       401:
 *         description: 인증 필요
 *       403:
 *         description: 접근 권한 없음
 */
router.get('/rooms/:roomId/messages/search', requireAuth, chatController.searchMessages);
/**
 * @swagger
 * /chat/messages/{messageId}:
 *   put:
 *     summary: 메시지 수정
 *     tags: [Chat]
 *     security:
 *       - sessionAuth: []
 *     parameters:
 *       - in: path
 *         name: messageId
 *         required: true
 *         schema:
 *           type: string
 *         description: 수정할 메시지 ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - content
 *             properties:
 *               content:
 *                 type: string
 *                 example: "수정된 메시지 내용"
 *     responses:
 *       200:
 *         description: 메시지 수정 성공
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: "메시지가 수정되었습니다."
 *                 data:
 *                   $ref: "#/components/schemas/Message"
 *       401:
 *         description: 인증 필요
 *       403:
 *         description: 수정 권한 없음 (본인 메시지만 수정 가능)
 *       404:
 *         description: 메시지를 찾을 수 없음
 */
router.put('/messages/:messageId', requireAuth, chatController.updateMessage);
/**
 * @swagger
 * /chat/messages/{messageId}:
 *   delete:
 *     summary: 메시지 삭제
 *     tags: [Chat]
 *     security:
 *       - sessionAuth: []
 *     parameters:
 *       - in: path
 *         name: messageId
 *         required: true
 *         schema:
 *           type: string
 *         description: 삭제할 메시지 ID
 *     responses:
 *       200:
 *         description: 메시지 삭제 성공
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: "메시지가 삭제되었습니다."
 *       401:
 *         description: 인증 필요
 *       403:
 *         description: 삭제 권한 없음 (본인 메시지만 삭제 가능)
 *       404:
 *         description: 메시지를 찾을 수 없음
 */
router.delete('/messages/:messageId', requireAuth, chatController.deleteMessage);

export default router;