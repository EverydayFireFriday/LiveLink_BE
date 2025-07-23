import { Socket } from 'socket.io';
import { ExtendedError } from 'socket.io/dist/namespace';
import { getDb } from '../../utils/db';
import { ObjectId } from 'mongodb';

interface AuthenticatedSocket extends Socket {
  userId: string;
  userEmail: string;
  userName: string;
  isAdmin: boolean;
}

export const authenticateSocket = async (
  socket: Socket, 
  next: (err?: ExtendedError) => void
) => {
  try {
    // 쿠키에서 세션 ID 추출
    const cookies = socket.handshake.headers.cookie;
    if (!cookies) {
      return next(new Error('No session cookie provided'));
    }

    // 세션 ID 파싱 (connect.sid=s%3A... 형태)
    const sessionMatch = cookies.match(/connect\.sid=([^;]+)/);
    if (!sessionMatch) {
      return next(new Error('No session ID found'));
    }

    const sessionId = decodeURIComponent(sessionMatch[1]);
    
    // Redis에서 세션 확인
    const db = getDb();
    const sessionData = await db.collection('sessions').findOne({
      _id: sessionId
    });

    if (!sessionData || !sessionData.session) {
      return next(new Error('Invalid session'));
    }

    const session = JSON.parse(sessionData.session);
    if (!session.userId) {
      return next(new Error('No user in session'));
    }

    // 사용자 정보 조회
    const user = await db.collection('users').findOne({
      _id: new ObjectId(session.userId)
    });

    if (!user) {
      return next(new Error('User not found'));
    }

    // Socket에 사용자 정보 첨부
    (socket as AuthenticatedSocket).userId = user._id.toString();
    (socket as AuthenticatedSocket).userEmail = user.email;
    (socket as AuthenticatedSocket).userName = user.name || user.email;
    (socket as AuthenticatedSocket).isAdmin = user.isAdmin || false;

    next();
  } catch (error) {
    console.error('Socket authentication error:', error);
    next(new Error('Authentication failed'));
  }
};

export type { AuthenticatedSocket };