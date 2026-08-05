<?php

namespace Tests\Feature;

use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class AppShellTest extends TestCase
{
    use RefreshDatabase;


    public function test_html_element_has_inline_background_color(): void
    {
        $this->get('/')
            ->assertOk()
            ->assertSee('<html lang="zh-Hant" style="background-color:#fffbeb">', false);
    }

    public function test_body_uses_inline_font_smoothing_instead_of_tailwind_class(): void
    {
        $response = $this->get('/')->assertOk();

        $response->assertDontSee('class="antialiased"', false);
        $response->assertSee('style="-webkit-font-smoothing:antialiased;-moz-osx-font-smoothing:grayscale"', false);
    }
}
