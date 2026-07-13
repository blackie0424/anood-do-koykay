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
            return redirect('/login');
        }
        return $next($request);
    }
}
