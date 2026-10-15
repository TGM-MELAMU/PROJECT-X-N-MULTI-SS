<?php

declare(strict_types=1);

namespace MultiSS\Services;

use PHPMailer\PHPMailer\Exception as MailException;
use PHPMailer\PHPMailer\PHPMailer;
use RuntimeException;

final class EmailService
{
    private array $config;

    public function __construct(?array $config = null)
    {
        $this->config = $config
            ?? require __DIR__ . '/../../config/mail.php';
    }

    public function isConfigured(): bool
    {
        return
            trim((string) $this->config['host']) !== ''
            && trim((string) $this->config['from_address']) !== '';
    }

    public function sendVerificationEmail(
        string $email,
        string $firstName,
        string $token
    ): void {
        if (!$this->isConfigured()) {
            throw new RuntimeException(
                'Email service is not configured.'
            );
        }

        $verificationUrl =
            rtrim(
                (string) $this->config['frontend_url'],
                '/'
            )
            . '/verify-email?token='
            . rawurlencode($token);

        $safeFirstName = htmlspecialchars(
            $firstName,
            ENT_QUOTES | ENT_SUBSTITUTE,
            'UTF-8'
        );

        $safeVerificationUrl = htmlspecialchars(
            $verificationUrl,
            ENT_QUOTES | ENT_SUBSTITUTE,
            'UTF-8'
        );

        $subject = 'Verify your MultiSS email address';

        $htmlBody = <<<HTML
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <title>{$subject}</title>
</head>
<body>
    <p>Hello {$safeFirstName},</p>

    <p>
        Thank you for registering with MultiSS.
        Please verify your email address by clicking the link below.
    </p>

    <p>
        <a href="{$safeVerificationUrl}">
            Verify email address
        </a>
    </p>

    <p>
        This verification link will expire after
        {$this->config['email_verification_expiry_minutes']} minutes.
    </p>

    <p>
        If you did not create this account,
        you can ignore this email.
    </p>
</body>
</html>
HTML;

        $textBody =
            "Hello {$firstName},\n\n"
            . "Thank you for registering with MultiSS.\n"
            . "Verify your email address using this link:\n"
            . $verificationUrl
            . "\n\nThis verification link will expire after "
            . $this->config['email_verification_expiry_minutes']
            . " minutes.\n\n"
            . "If you did not create this account, "
            . "you can ignore this email.";

        $this->send(
            $email,
            $subject,
            $htmlBody,
            $textBody
        );
    }

    public function sendPasswordResetEmail(
        string $email,
        string $firstName,
        string $token
    ): void {
        if (!$this->isConfigured()) {
            throw new RuntimeException(
                'Email service is not configured.'
            );
        }

        $resetUrl =
            rtrim(
                (string) $this->config['frontend_url'],
                '/'
            )
            . '/reset-password?token='
            . rawurlencode($token);

        $safeFirstName = htmlspecialchars(
            $firstName,
            ENT_QUOTES | ENT_SUBSTITUTE,
            'UTF-8'
        );

        $safeResetUrl = htmlspecialchars(
            $resetUrl,
            ENT_QUOTES | ENT_SUBSTITUTE,
            'UTF-8'
        );

        $subject = 'Reset your MultiSS password';

        $htmlBody = <<<HTML
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <title>{$subject}</title>
</head>
<body>
    <p>Hello {$safeFirstName},</p>

    <p>
        We received a request to reset your MultiSS password.
        You can choose a new password by clicking the link below.
    </p>

    <p>
        <a href="{$safeResetUrl}">
            Reset password
        </a>
    </p>

    <p>
        This password reset link will expire after
        {$this->config['password_reset_expiry_minutes']} minutes.
    </p>

    <p>
        If you did not request a password reset,
        you can ignore this email.
    </p>
</body>
</html>
HTML;

        $textBody =
            "Hello {$firstName},\n\n"
            . "We received a request to reset your MultiSS password.\n"
            . "Reset your password using this link:\n"
            . $resetUrl
            . "\n\nThis password reset link will expire after "
            . $this->config['password_reset_expiry_minutes']
            . " minutes.\n\n"
            . "If you did not request a password reset, "
            . "you can ignore this email.";

        $this->send(
            $email,
            $subject,
            $htmlBody,
            $textBody
        );
    }

    private function send(
        string $recipientEmail,
        string $subject,
        string $htmlBody,
        string $textBody
    ): void {
        $mail = new PHPMailer(true);

        try {
            $mail->isSMTP();

            $mail->Host =
                (string) $this->config['host'];

            $mail->Port =
                (int) $this->config['port'];

            $username =
                trim((string) $this->config['username']);

            $password =
                (string) $this->config['password'];

            if ($username !== '') {
                $mail->SMTPAuth = true;
                $mail->Username = $username;
                $mail->Password = $password;
            } else {
                $mail->SMTPAuth = false;
            }

            $encryption = strtolower(
                trim(
                    (string) $this->config['encryption']
                )
            );

            if ($encryption === 'tls') {
                $mail->SMTPSecure =
                    PHPMailer::ENCRYPTION_STARTTLS;
            } elseif ($encryption === 'ssl') {
                $mail->SMTPSecure =
                    PHPMailer::ENCRYPTION_SMTPS;
            }

            $mail->CharSet = 'UTF-8';

            $mail->setFrom(
                (string) $this->config['from_address'],
                (string) $this->config['from_name']
            );

            $mail->addAddress(
                $recipientEmail
            );

            $mail->isHTML(true);

            $mail->Subject = $subject;
            $mail->Body = $htmlBody;
            $mail->AltBody = $textBody;

            $mail->send();
        } catch (MailException $exception) {
            throw new RuntimeException(
                'Unable to send email.',
                0,
                $exception
            );
        }
    }
}