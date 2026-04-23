<?php

namespace App\Providers;

use App\Domain\Auth\Policies\UserAuthPolicy;
use App\Domain\Broadcast\Policies\BroadcastPolicy;
use App\Domain\Core\Policies\BlockPolicy;
use App\Domain\Core\Policies\CampaignPolicy;
use App\Domain\Core\Policies\ChapterPolicy;
use App\Domain\Core\Policies\CharacterPolicy;
use App\Domain\Core\Policies\ItemPolicy;
use App\Domain\Core\Policies\MapPolicy;
use App\Domain\Core\Policies\ScenarioPolicy;
use App\Domain\Report\Policies\ReportPolicy;
use App\Models\Announcement;
use App\Models\Block;
use App\Models\Campaign;
use App\Models\Chapter;
use App\Models\Character;
use App\Models\Item;
use App\Models\Map;
use App\Models\Report;
use App\Models\Scenario;
use App\Models\User;
use Illuminate\Cache\RateLimiting\Limit;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Gate;
use Illuminate\Support\Facades\RateLimiter;
use Illuminate\Support\ServiceProvider;

class AppServiceProvider extends ServiceProvider
{
    /**
     * Register any application services.
     */
    public function register(): void
    {
        //
    }

    /**
     * Bootstrap any application services.
     */
    public function boot(): void
    {
        Gate::policy(User::class, UserAuthPolicy::class);
        Gate::policy(Campaign::class, CampaignPolicy::class);
        Gate::policy(Scenario::class, ScenarioPolicy::class);
        Gate::policy(Chapter::class, ChapterPolicy::class);
        Gate::policy(Block::class, BlockPolicy::class);
        Gate::policy(Map::class, MapPolicy::class);
        Gate::policy(Character::class, CharacterPolicy::class);
        Gate::policy(Item::class, ItemPolicy::class);
        Gate::policy(Report::class, ReportPolicy::class);
        Gate::policy(Announcement::class, BroadcastPolicy::class);

        RateLimiter::for('auth', function (Request $request) {
            return Limit::perMinute(10)->by($request->ip());
        });
    }
}
