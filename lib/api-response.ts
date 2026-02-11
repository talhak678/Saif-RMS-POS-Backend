import { NextResponse } from 'next/server'

export type ApiResponse<T = any> = {
    success: boolean
    message?: string
    data?: T
    error?: any
}

export function successResponse<T>(data: T, message?: string, status: number = 200) {
    return NextResponse.json(
        {
            success: true,
            message,
            data,
        },
        { status }
    )
}

export function errorResponse(message: string, error?: any, status: number = 400) {
    return NextResponse.json(
        {
            success: false,
            message,
            error,
        },
        { status }
    )
}
