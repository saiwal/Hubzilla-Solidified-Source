<?php
namespace Theme\Solidified\Api\Handlers;

use Theme\Solidified\Api\Auth;
use Theme\Solidified\Api\Response;
use App;

class Portability
{
    private const VALID_SECTIONS = [
        'channel', 'connections', 'config', 'apps',
        'chatrooms', 'events', 'webpages', 'wikis',
    ];

    public function get(): void
    {
        $uid = Auth::requireLocalGet();

        $datatype = App::$argv[2] ?? '';
        switch ($datatype) {
            case 'export':
                $this->exportChannel($uid);
                break;
            case '':
                $this->getMetadata($uid);
                break;
            default:
                Response::error(404, 'Unknown endpoint');
        }
    }

    // ── Metadata ─────────────────────────────────────────────────────────────

    private function getMetadata(int $uid): void
    {
        require_once('include/channel.php');

        $export_enabled = \Zotlabs\Lib\Apps::system_app_installed($uid, 'Channel Export');

        $account = App::get_account();
        $year_start = (int) datetime_convert('UTC', date_default_timezone_get(), $account['account_created'] ?? 'now', 'Y');
        $year_end = (int) datetime_convert('UTC', date_default_timezone_get(), 'now', 'Y');

        $years = [];
        for ($y = $year_start; $y <= $year_end; $y++) {
            $years[] = $y;
        }

        Response::send([
            'export_enabled' => (bool) $export_enabled,
            'sections' => self::VALID_SECTIONS,
            'default_sections' => get_default_export_sections(),
            'years' => $years,
        ]);
    }

    // ── Identity export download ────────────────────────────────────────────

    private function exportChannel(int $uid): void
    {
        require_once('include/channel.php');

        if (!\Zotlabs\Lib\Apps::system_app_installed($uid, 'Channel Export')) {
            Response::error(403, 'Channel Export app is not installed');
        }

        $raw = trim((string) ($_GET['sections'] ?? ''));
        $requested = $raw !== '' ? explode(',', $raw) : [];
        $sections = array_values(array_intersect(self::VALID_SECTIONS, $requested));

        if (!$sections) {
            Response::error(400, 'No valid sections specified');
        }

        $channel = App::get_channel();
        $export = json_encode(identity_basic_export($uid, $sections, false));

        header('Content-Type: application/json');
        header('Content-Disposition: attachment; filename="' . $channel['channel_address'] . '-' . implode('-', $sections) . '.json"');
        header('Content-Length: ' . strlen($export));

        echo $export;
        exit;
    }
}
