<?php

use Illuminate\Foundation\Application;
use Illuminate\Foundation\Configuration\Exceptions;
use Illuminate\Foundation\Configuration\Middleware;

return Application::configure(basePath: dirname(__DIR__))
    ->withRouting(
        web: __DIR__.'/../routes/web.php',
        api: __DIR__.'/../routes/api.php',
        apiPrefix: 'prefix/api',
        commands: __DIR__.'/../routes/console.php',
        health: '/up',
    )
    ->withMiddleware(function (Middleware $middleware) {
        $middleware->api(prepend: [
            \Laravel\Sanctum\Http\Middleware\EnsureFrontendRequestsAreStateful::class,
        ]);
        $middleware->web(append: [
            \App\Http\Middleware\HandleInertiaRequests::class,
        ]);
        $middleware->alias([
            'admin' => \App\Http\Middleware\EnsureUserIsAdmin::class,
            'editor' => \App\Http\Middleware\EnsureUserIsEditor::class,
        ]);
    })
    ->withExceptions(function (Exceptions $exceptions) {
        // Handle database connection errors
        $exceptions->render(function (\Illuminate\Database\QueryException $e, $request) {
            \Log::error('Database query error: ' . $e->getMessage(), [
                'sql' => $e->getSql(),
                'bindings' => $e->getBindings(),
                'request' => $request->all()
            ]);

            if ($request->expectsJson()) {
                return response()->json([
                    'message' => '資料庫操作失敗，請稍後再試',
                    'error' => 'database_error'
                ], 500);
            }

            return redirect()->back()->withErrors(['error' => '資料庫操作失敗，請稍後再試']);
        });

        // Handle model not found exceptions
        $exceptions->render(function (\Illuminate\Database\Eloquent\ModelNotFoundException $e, $request) {
            \Log::warning('Model not found: ' . $e->getMessage());

            if ($request->expectsJson()) {
                return response()->json([
                    'message' => '找不到指定的資源',
                    'error' => 'resource_not_found'
                ], 404);
            }

            return redirect()->back()->withErrors(['error' => '找不到指定的資源']);
        });

        // Handle validation exceptions
        $exceptions->render(function (\Illuminate\Validation\ValidationException $e, $request) {
            if ($request->expectsJson()) {
                return response()->json([
                    'message' => '資料驗證失敗',
                    'errors' => $e->errors()
                ], 422);
            }

            return redirect()->back()->withErrors($e->errors())->withInput();
        });

        // Handle authentication exceptions — always return JSON on API routes
        $exceptions->render(function (\Illuminate\Auth\AuthenticationException $e, $request) {
            if ($request->is('prefix/api/*') || $request->expectsJson()) {
                return response()->json([
                    'message' => '請先登入',
                    'error' => 'unauthenticated'
                ], 401);
            }

            return redirect()->guest(route('login'));
        });

        // Handle authorization exceptions
        $exceptions->render(function (\Illuminate\Auth\Access\AuthorizationException $e, $request) {
            if ($request->expectsJson()) {
                return response()->json([
                    'message' => '沒有權限執行此操作',
                    'error' => 'authorization_error'
                ], 403);
            }

            return redirect()->back()->withErrors(['error' => '沒有權限執行此操作']);
        });

        // Handle file not found exceptions
        $exceptions->render(function (\Symfony\Component\HttpKernel\Exception\NotFoundHttpException $e, $request) {
            if ($request->expectsJson()) {
                return response()->json([
                    'message' => '找不到指定的頁面或資源',
                    'error' => 'not_found'
                ], 404);
            }

            // For web requests, let Laravel handle it normally (show 404 page)
            return null;
        });

        // Handle timeout exceptions
        $exceptions->render(function (\Illuminate\Http\Client\ConnectionException $e, $request) {
            \Log::error('Connection timeout: ' . $e->getMessage());

            if ($request->expectsJson()) {
                return response()->json([
                    'message' => '連線超時，請稍後再試',
                    'error' => 'timeout_error'
                ], 408);
            }

            return redirect()->back()->withErrors(['error' => '連線超時，請稍後再試']);
        });

        // Handle general exceptions
        $exceptions->render(function (\Exception $e, $request) {
            // Don't handle specific exceptions that should be handled elsewhere
            if ($e instanceof \Illuminate\Database\QueryException ||
                $e instanceof \Illuminate\Database\Eloquent\ModelNotFoundException ||
                $e instanceof \Illuminate\Validation\ValidationException ||
                $e instanceof \Illuminate\Auth\Access\AuthorizationException ||
                $e instanceof \Illuminate\Auth\AuthenticationException ||
                $e instanceof \Symfony\Component\HttpKernel\Exception\HttpException ||
                $e instanceof \Symfony\Component\HttpKernel\Exception\NotFoundHttpException ||
                $e instanceof \Illuminate\Http\Client\ConnectionException) {
                return null;
            }

            // Log unexpected errors
            \Log::error('Unexpected error: ' . $e->getMessage(), [
                'exception' => $e,
                'trace' => $e->getTraceAsString(),
                'request' => $request->all()
            ]);

            if ($request->expectsJson()) {
                return response()->json([
                    'message' => '系統發生錯誤，請稍後再試',
                    'error' => 'internal_error'
                ], 500);
            }

            return redirect()->back()->withErrors(['error' => '系統發生錯誤，請稍後再試']);
        });
    })->create();
