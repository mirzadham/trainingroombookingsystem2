<?php

use Illuminate\Foundation\Application;
use Illuminate\Foundation\Configuration\Exceptions;
use Illuminate\Foundation\Configuration\Middleware;

$app = Application::configure(basePath: dirname(__DIR__))
    ->withRouting(
        web: __DIR__.'/../routes/web.php',
        api: __DIR__.'/../routes/api.php',
        commands: __DIR__.'/../routes/console.php',
        health: '/up',
    )
    ->withMiddleware(function (Middleware $middleware): void {
        $middleware->alias([
            'admin' => \App\Http\Middleware\EnsureUserIsAdmin::class,
            'super-admin' => \App\Http\Middleware\EnsureUserIsSuperAdmin::class,
        ]);
    })
    ->withExceptions(function (Exceptions $exceptions): void {
        //
    })->create();

// Resolve and set the public path synchronously immediately on startup
$publicPath = null;

if (isset($_ENV['PUBLIC_PATH']) && $_ENV['PUBLIC_PATH']) {
    $publicPath = $_ENV['PUBLIC_PATH'];
} elseif (isset($_SERVER['PUBLIC_PATH']) && $_SERVER['PUBLIC_PATH']) {
    $publicPath = $_SERVER['PUBLIC_PATH'];
} elseif (isset($_SERVER['SCRIPT_FILENAME']) && (str_ends_with($_SERVER['SCRIPT_FILENAME'], 'index.php') || str_ends_with($_SERVER['SCRIPT_FILENAME'], 'debug-path.php'))) {
    $publicPath = dirname($_SERVER['SCRIPT_FILENAME']);
} elseif (is_dir(base_path('../public_html/roombooking'))) {
    $publicPath = realpath(base_path('../public_html/roombooking'));
} elseif (is_dir('/home/mimosaca/public_html/roombooking')) {
    $publicPath = '/home/mimosaca/public_html/roombooking';
}

if ($publicPath) {
    $app->usePublicPath($publicPath);
}

return $app;
