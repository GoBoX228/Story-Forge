<?php

namespace App\Providers;

use App\Domain\Auth\Policies\UserAuthPolicy;
use App\Domain\Broadcast\Policies\BroadcastPolicy;
use App\Domain\Core\Policies\AssetPolicy;
use App\Domain\Core\Policies\CampaignPolicy;
use App\Domain\Core\Policies\CharacterPolicy;
use App\Domain\Core\Policies\EntityLinkPolicy;
use App\Domain\Core\Policies\FactionPolicy;
use App\Domain\Core\Policies\ItemPolicy;
use App\Domain\Core\Policies\LocationPolicy;
use App\Domain\Core\Policies\MapPolicy;
use App\Domain\Core\Policies\PublishedContentPolicy;
use App\Domain\Core\Policies\ScenarioPolicy;
use App\Domain\Core\Policies\ScenarioNodePolicy;
use App\Domain\Core\Policies\ScenarioTransitionPolicy;
use App\Domain\Core\Policies\TagPolicy;
use App\Domain\Core\Policies\WorldEventPolicy;
use App\Domain\Report\Policies\ReportPolicy;
use App\Models\Announcement;
use App\Models\Asset;
use App\Models\Campaign;
use App\Models\Character;
use App\Models\EntityLink;
use App\Models\Faction;
use App\Models\Item;
use App\Models\Location;
use App\Models\Map;
use App\Models\PublishedContent;
use App\Models\Report;
use App\Models\Scenario;
use App\Models\ScenarioNode;
use App\Models\ScenarioTransition;
use App\Models\Tag;
use App\Models\User;
use App\Models\WorldEvent;
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
        Gate::policy(Asset::class, AssetPolicy::class);
        Gate::policy(Campaign::class, CampaignPolicy::class);
        Gate::policy(Scenario::class, ScenarioPolicy::class);
        Gate::policy(ScenarioNode::class, ScenarioNodePolicy::class);
        Gate::policy(ScenarioTransition::class, ScenarioTransitionPolicy::class);
        Gate::policy(Tag::class, TagPolicy::class);
        Gate::policy(EntityLink::class, EntityLinkPolicy::class);
        Gate::policy(PublishedContent::class, PublishedContentPolicy::class);
        Gate::policy(Location::class, LocationPolicy::class);
        Gate::policy(Faction::class, FactionPolicy::class);
        Gate::policy(WorldEvent::class, WorldEventPolicy::class);
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
