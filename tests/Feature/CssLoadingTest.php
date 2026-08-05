<?php

namespace Tests\Feature;

use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class CssLoadingTest extends TestCase
{
    use RefreshDatabase;


    public function test_css_is_loaded_via_non_blocking_preload(): void
    {
        $this->get('/')
            ->assertOk()
            ->assertSee('rel="preload" as="style" onload="this.onload=null;this.rel=\'stylesheet\'"', false);
    }

    public function test_noscript_fallback_stylesheet_present(): void
    {
        $this->get('/')
            ->assertOk()
            ->assertSee('<noscript><link rel="stylesheet"', false);
    }

    public function test_css_is_not_loaded_via_blocking_link_outside_noscript(): void
    {
        $content = $this->get('/')->assertOk()->getContent();

        $this->assertSame(
            1,
            substr_count($content, '<link rel="stylesheet"'),
            'CSS 只應該透過 noscript fallback 出現一次 rel="stylesheet"，其餘應改走 preload 非阻塞載入',
        );
    }
}
