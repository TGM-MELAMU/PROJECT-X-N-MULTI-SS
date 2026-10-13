<?php

declare(strict_types=1);

namespace MultiSS\Controllers;

use MultiSS\Core\Logger;
use MultiSS\Core\Request;
use MultiSS\Core\Response;
use MultiSS\Core\Session;
use MultiSS\Services\EmailService;
use MultiSS\Services\EmailVerificationService;
use MultiSS\Services\ForgotPasswordService;
use MultiSS\Services\LoginService;
use MultiSS\Services\RegistrationService;
use MultiSS\Services\ResendVerificationService;
use MultiSS\Services\SessionAuthService;
use MultiSS\Services\ResetPasswordService;
use RuntimeException;

final class AuthController
{
    private RegistrationService $registrationService;
    private EmailService $emailService;
    private EmailVerificationService $emailVerificationService;
    private ResendVerificationService $resendVerificationService;
    private LoginService $loginService;
    private SessionAuthService $sessionAuthService;
    private ForgotPasswordService $forgotPasswordService;
    private ResetPasswordService $resetPasswordService;

   public function __construct(
    ?RegistrationService $registrationService = null,
    ?EmailService $emailService = null,
    ?EmailVerificationService $emailVerificationService = null,
    ?ResendVerificationService $resendVerificationService = null,
    ?LoginService $loginService = null,
    ?SessionAuthService $sessionAuthService = null,
    ?ForgotPasswordService $forgotPasswordService = null,
    ?ResetPasswordService $resetPasswordService = null
) {
        $this->registrationService =
            $registrationService ?? new RegistrationService();

        $this->emailService =
            $emailService ?? new EmailService();

        $this->emailVerificationService =
            $emailVerificationService ?? new EmailVerificationService();

        $this->resendVerificationService =
            $resendVerificationService ?? new ResendVerificationService();

        $this->loginService =
            $loginService ?? new LoginService();

        $this->sessionAuthService =
            $sessionAuthService ?? new SessionAuthService();

        $this->forgotPasswordService =
            $forgotPasswordService ?? new ForgotPasswordService();

            $this->resetPasswordService =
    $resetPasswordService ?? new ResetPasswordService();
 
    }

    public function me(Request $request): void
    {
        $user = $this->sessionAuthService->currentUser();

        if ($user === null) {
            Response::json([
                'success' => false,
                'message' => 'Authentication required.',
            ], 401);

            return;
        }

        Response::json([
            'success' => true,
            'user' => $user,
        ], 200);
    }

    public function register(Request $request): void
    {
        $data = $request->body();

        $result = $this->registrationService->register(
            $data
        );

        if (!$result['success']) {
            Response::json([
                'success' => false,
                'message' => 'Registration failed.',
                'errors' => $result['errors'],
            ], 422);

            return;
        }

        $emailSent = false;

        try {
            $this->emailService->sendVerificationEmail(
                strtolower(trim((string) $data['email'])),
                trim((string) $data['first_name']),
                $result['verification_token']
            );

            $emailSent = true;
        } catch (RuntimeException $exception) {
            Logger::warning(
                'Verification email could not be sent.',
                [
                    'user_id' => (int) $result['user_id'],
                    'exception' => $exception::class,
                    'message' => $exception->getMessage(),
                ]
            );
        }

        Response::json([
            'success' => true,
            'message' => $emailSent
                ? 'Registration successful. Please verify your email.'
                : 'Registration successful, but the verification email could not be sent. Please request a new verification email.',
            'user_id' => (int) $result['user_id'],
            'verification_email_sent' => $emailSent,
        ], 201);
    }

    public function verifyEmail(Request $request): void
    {
        $data = $request->body();

        $token = isset($data['token'])
            ? trim((string) $data['token'])
            : '';

        if ($token === '') {
            Response::json([
                'success' => false,
                'message' => 'Verification token is required.',
            ], 422);

            return;
        }

        $result = $this->emailVerificationService->verify(
            $token
        );

        if (!$result['success']) {
            Response::json([
                'success' => false,
                'message' => $result['message'],
            ], 400);

            return;
        }

        Response::json([
            'success' => true,
            'message' => $result['message'],
        ], 200);
    }

    public function resendVerification(Request $request): void
    {
        $data = $request->body();

        $email = isset($data['email'])
            ? trim((string) $data['email'])
            : '';

        $result =
            $this->resendVerificationService
                ->createTokenForEmail($email);

        if (!$result['success']) {
            Response::json([
                'success' => false,
                'message' => 'Invalid request.',
                'errors' => $result['errors'],
            ], 422);

            return;
        }

        if ($result['send_email']) {
            try {
                $this->emailService->sendVerificationEmail(
                    $result['email'],
                    $result['first_name'],
                    $result['verification_token']
                );
            } catch (RuntimeException $exception) {
                Logger::warning(
                    'Resent verification email could not be sent.',
                    [
                        'exception' => $exception::class,
                        'message' => $exception->getMessage(),
                    ]
                );
            }
        }

        Response::json([
            'success' => true,
            'message' =>
                'If an unverified account exists for that email, a verification message has been sent.',
        ], 200);
    }

    public function login(Request $request): void
    {
        $data = $request->body();

        $result = $this->loginService->authenticate(
            $data
        );

        if (!$result['success']) {
            $response = [
                'success' => false,
                'message' => $result['message'],
            ];

            if (isset($result['errors'])) {
                $response['errors'] = $result['errors'];
            }

            Response::json(
                $response,
                (int) $result['status']
            );

            return;
        }

        Session::regenerate();

        Session::set(
            'auth_user_id',
            (int) $result['user']['user_id']
        );

        Response::json([
            'success' => true,
            'message' => 'Login successful.',
            'user' => $result['user'],
        ], 200);
    }

    public function logout(Request $request): void
    {
        Session::destroy();

        Response::json([
            'success' => true,
            'message' => 'Logout successful.',
        ], 200);
    }

    public function forgotPassword(Request $request): void
    {
        $data = $request->body();

        $email = isset($data['email'])
            ? trim((string) $data['email'])
            : '';

        $result =
            $this->forgotPasswordService
                ->createTokenForEmail($email);

        if (!$result['success']) {
            Response::json([
                'success' => false,
                'message' => 'Invalid request.',
                'errors' => $result['errors'],
            ], 422);

            return;
        }

        if ($result['send_email']) {
            try {
                $this->emailService->sendPasswordResetEmail(
                    $result['email'],
                    $result['first_name'],
                    $result['reset_token']
                );
            } catch (RuntimeException $exception) {
                Logger::warning(
                    'Password reset email could not be sent.',
                    [
                        'exception' => $exception::class,
                        'message' => $exception->getMessage(),
                    ]
                );
            }
        }

        Response::json([
            'success' => true,
            'message' =>
                'If an account exists for that email, a password reset message has been sent.',
        ], 200);
    }
public function resetPassword(Request $request): void
{
    $data = $request->body();

    $token = isset($data['token'])
        ? trim((string) $data['token'])
        : '';

    $password = isset($data['password'])
        && is_string($data['password'])
            ? $data['password']
            : '';

    $result =
        $this->resetPasswordService->reset(
            $token,
            $password
        );

    if (!$result['success']) {
        $response = [
            'success' => false,
            'message' => $result['message'],
        ];

        if (isset($result['errors'])) {
            $response['errors'] =
                $result['errors'];
        }

        Response::json(
            $response,
            (int) $result['status']
        );

        return;
    }

    Response::json([
        'success' => true,
        'message' => $result['message'],
    ], 200);
 }
}