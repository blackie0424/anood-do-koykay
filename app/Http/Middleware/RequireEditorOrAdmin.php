<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;

class RequireEditorOrAdmin
{
    public function handle(Request $request, Closure $next)
    {
        $user = $request->user();
        if (!$user || !in_array($user->role, ['admin', 'editor'])) {
            if ($request->expectsJson()) {
                return response()->json(['message' => 'Unauthenticated.'], 401);
            }
            return redirect('/login');
        }
        return $next($request);
    }
}
