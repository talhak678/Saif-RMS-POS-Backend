import { successResponse } from '@/lib/api-response'
import { clearAuthCookie } from '@/lib/auth'

export async function POST() {
    await clearAuthCookie()
    return successResponse(null, 'Logged out successfully')
}
