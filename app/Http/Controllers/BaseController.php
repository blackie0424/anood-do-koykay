<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use Illuminate\Database\Eloquent\ModelNotFoundException;
use Illuminate\Validation\ValidationException;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;
use Exception;

abstract class BaseController extends Controller
{
    /**
     * Execute a database transaction with error handling
     *
     * @param callable $callback
     * @param string $operation
     * @return mixed
     * @throws Exception
     */
    protected function executeWithTransaction(callable $callback, string $operation = 'database operation')
    {
        try {
            return DB::transaction($callback);
        } catch (ValidationException $e) {
            // Re-throw validation exceptions as they should be handled by the framework
            throw $e;
        } catch (ModelNotFoundException $e) {
            Log::warning("Resource not found during {$operation}: " . $e->getMessage());
            throw $e;
        } catch (Exception $e) {
            Log::error("Transaction failed during {$operation}: " . $e->getMessage(), [
                'exception' => $e,
                'trace' => $e->getTraceAsString()
            ]);
            
            throw new Exception("操作失敗，請稍後再試", 500, $e);
        }
    }

    /**
     * Handle file operations with error handling
     *
     * @param callable $callback
     * @param string $operation
     * @param bool $throwOnError
     * @return mixed
     */
    protected function executeFileOperation(callable $callback, string $operation = 'file operation', bool $throwOnError = false)
    {
        try {
            return $callback();
        } catch (Exception $e) {
            Log::error("File operation failed during {$operation}: " . $e->getMessage(), [
                'exception' => $e,
                'trace' => $e->getTraceAsString()
            ]);
            
            if ($throwOnError) {
                throw new Exception("檔案操作失敗，請稍後再試", 500, $e);
            }
            
            // Return null or false to indicate failure without throwing
            return null;
        }
    }

    /**
     * Find model or fail with custom error handling
     *
     * @param string $modelClass
     * @param mixed $id
     * @param string $resourceName
     * @return mixed
     * @throws ModelNotFoundException
     */
    protected function findResourceOrFail(string $modelClass, $id, string $resourceName = 'resource')
    {
        try {
            return $modelClass::findOrFail($id);
        } catch (ModelNotFoundException $e) {
            Log::warning("Resource not found: {$resourceName} with ID {$id}");
            throw new ModelNotFoundException("找不到指定的{$resourceName}");
        }
    }

    /**
     * Find related model or fail with custom error handling
     *
     * @param string $modelClass
     * @param array $conditions
     * @param string $resourceName
     * @return mixed
     * @throws ModelNotFoundException
     */
    protected function findRelatedResourceOrFail(string $modelClass, array $conditions, string $resourceName = 'resource')
    {
        try {
            $query = $modelClass::query();
            foreach ($conditions as $field => $value) {
                $query->where($field, $value);
            }
            
            $resource = $query->firstOrFail();
            return $resource;
        } catch (ModelNotFoundException $e) {
            Log::warning("Related resource not found: {$resourceName} with conditions " . json_encode($conditions));
            throw new ModelNotFoundException("找不到指定的{$resourceName}");
        }
    }

    /**
     * Validate request with enhanced error handling
     *
     * @param Request $request
     * @param array $rules
     * @param array $messages
     * @return array
     * @throws ValidationException
     */
    protected function validateRequest(Request $request, array $rules, array $messages = [])
    {
        try {
            return $request->validate($rules, $messages);
        } catch (ValidationException $e) {
            Log::info("Validation failed", [
                'errors' => $e->errors(),
                'input' => $request->except(['password', 'password_confirmation'])
            ]);
            throw $e;
        }
    }

    /**
     * Handle external service operations (like Supabase) with error handling
     *
     * @param callable $callback
     * @param string $serviceName
     * @param bool $throwOnError
     * @return mixed
     */
    protected function executeExternalServiceOperation(callable $callback, string $serviceName = 'external service', bool $throwOnError = false)
    {
        try {
            return $callback();
        } catch (Exception $e) {
            Log::error("External service operation failed with {$serviceName}: " . $e->getMessage(), [
                'exception' => $e,
                'service' => $serviceName
            ]);
            
            if ($throwOnError) {
                throw new Exception("外部服務暫時無法使用，請稍後再試", 503, $e);
            }
            
            return null;
        }
    }

    /**
     * Log operation for debugging and monitoring
     *
     * @param string $operation
     * @param array $context
     * @param string $level
     */
    protected function logOperation(string $operation, array $context = [], string $level = 'info')
    {
        Log::log($level, $operation, $context);
    }

    /**
     * Handle common controller errors and return appropriate responses
     *
     * @param Exception $e
     * @param string $defaultMessage
     * @return \Illuminate\Http\JsonResponse|\Illuminate\Http\RedirectResponse
     */
    protected function handleControllerError(Exception $e, string $defaultMessage = '操作失敗')
    {
        if ($e instanceof ModelNotFoundException) {
            if (request()->expectsJson()) {
                return response()->json([
                    'message' => $e->getMessage() ?: '找不到指定的資源',
                    'error' => 'resource_not_found'
                ], 404);
            }
            
            return redirect()->back()
                ->withErrors(['error' => $e->getMessage() ?: '找不到指定的資源']);
        }

        if ($e instanceof ValidationException) {
            if (request()->expectsJson()) {
                return response()->json([
                    'message' => '資料驗證失敗',
                    'errors' => $e->errors()
                ], 422);
            }
            
            return redirect()->back()->withErrors($e->errors())->withInput();
        }

        // Log unexpected errors
        Log::error('Unexpected controller error: ' . $e->getMessage(), [
            'exception' => $e,
            'trace' => $e->getTraceAsString(),
            'request' => request()->all()
        ]);

        if (request()->expectsJson()) {
            return response()->json([
                'message' => $defaultMessage,
                'error' => 'internal_error'
            ], 500);
        }

        return redirect()->back()
            ->with('error', $defaultMessage);
    }
}
