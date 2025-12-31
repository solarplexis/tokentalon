import { NextRequest, NextResponse } from 'next/server';
import * as gameService from '@/lib/services/gameService';

/**
 * GET /api/game/session/:sessionId
 * Get game session info
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ sessionId: string }> }
) {
  try {
    const { sessionId } = await params;
    const session = gameService.getGameSession(sessionId);

    if (!session) {
      return NextResponse.json(
        { error: 'Session not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      sessionId: session.sessionId,
      playerAddress: session.playerAddress,
      timestamp: session.timestamp,
      active: session.active,
      prizeId: session.prizeId,
      network: session.network
    });
  } catch (error: any) {
    console.error('Error getting session:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to get session' },
      { status: 500 }
    );
  }
}
