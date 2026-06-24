<?php

namespace App\Console\Commands;

use App\Models\User;
use Illuminate\Console\Command;

class CreateAdminCommand extends Command
{
    protected $signature = 'admin:create
        {--email= : 管理員 email}
        {--password= : 管理員密碼}
        {--name= : 管理員顯示名稱（預設為 email 前綴）}';

    protected $description = '建立 web admin 帳號';

    public function handle(): int
    {
        $email    = $this->option('email');
        $password = $this->option('password');
        $name     = $this->option('name') ?? strstr($email, '@', before_needle: true);

        if (User::where('email', $email)->exists()) {
            $this->error("Email {$email} 已存在，無法重複建立。");
            return self::FAILURE;
        }

        $user = User::create([
            'email'    => $email,
            'password' => $password,
            'name'     => $name,
            'source'   => 'web',
        ]);
        $user->role = 'admin';
        $user->save();

        $this->info("Admin 帳號 {$email} 建立成功。");

        return self::SUCCESS;
    }
}
