<?php

declare(strict_types=1);

namespace MultiSS\Integrations;

use InvalidArgumentException;

/** Pure policy: adapters must validate URLs BEFORE making any outbound request. */
final class OutboundUrlPolicy
{
    /** @param list<string> $approvedHosts Server-owned exact allowlist; never user input. */
    public static function assertAllowed(string $url, array $approvedHosts): void
    {
        if ($url === '' || preg_match('/[\x00-\x20\x7f]/', $url)) {
            throw new InvalidArgumentException('Invalid integration URL.');
        }
        $parts = parse_url($url);
        if (!is_array($parts)
            || strtolower((string) ($parts['scheme'] ?? '')) !== 'https'
            || !isset($parts['host'])
            || isset($parts['user'], $parts['pass'])
            || isset($parts['user'])
            || isset($parts['fragment'])
            || (isset($parts['port']) && (int) $parts['port'] !== 443)) {
            throw new InvalidArgumentException('Outbound integrations require a clean HTTPS URL.');
        }
        $host = strtolower((string) $parts['host']);
        if (!preg_match('/^[a-z0-9-]+(?:\.[a-z0-9-]+)+$/D', $host)
            || filter_var($host, FILTER_VALIDATE_IP) !== false) {
            throw new InvalidArgumentException('Integration host is invalid.');
        }
        $allow = array_map('strtolower', $approvedHosts);
        if (!in_array($host, $allow, true)) {
            throw new InvalidArgumentException('Integration host not allowlisted.');
        }
    }
}
