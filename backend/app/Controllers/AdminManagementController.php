<?php

declare(strict_types=1);

namespace MultiSS\Controllers;

use DomainException;
use InvalidArgumentException;
use MultiSS\Core\Logger;
use MultiSS\Core\Response;
use OutOfBoundsException;
use Throwable;

/** Shared response/exception handler for Phase 8 admin management controllers. */
abstract class AdminManagementController
{
    protected function respond(callable $callback, ?string $message = null, int $status = 200): void
    {
        try {
            $body = ['success' => true, 'data' => $callback()];
            if ($message !== null) {
                $body['message'] = $message;
            }
            Response::json($body, $status);
        } catch (InvalidArgumentException $error) {
            Response::json(['success' => false, 'message' => $error->getMessage()], 422);
        } catch (OutOfBoundsException $error) {
            Response::json(['success' => false, 'message' => $error->getMessage()], 404);
        } catch (DomainException $error) {
            Response::json(['success' => false, 'message' => $error->getMessage()], 409);
        } catch (Throwable $error) {
            Logger::error('Admin management operation failed', [
                'exception' => $error::class,
                'message' => $error->getMessage(),
            ]);
            Response::json(['success' => false, 'message' => 'Unable to complete admin operation.'], 500);
        }
    }
}
