<?php

namespace Database\Seeders;

use App\Models\Campaign;
use App\Models\Character;
use App\Models\EntityLink;
use App\Models\Item;
use App\Models\Map;
use App\Models\Scenario;
use App\Models\ScenarioNode;
use App\Models\ScenarioTransition;
use App\Models\Tag;
use App\Models\User;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;

class GoBoxContentSeeder extends Seeder
{
    private const MAP_NAME = 'Ледяной маяк — нижний ярус';

    private const TILE_FROZEN_FLOOR = 'system:tile:core:v1:frozen-stone-floor';

    private const TILE_FROZEN_WALL = 'system:tile:core:v1:frozen-stone-wall';

    private const TILE_ICE = 'system:tile:core:v1:ice';

    public function run(): void
    {
        DB::transaction(function (): void {
            $user = User::updateOrCreate(
                ['email' => 'vilyougiv@gmail.com'],
                [
                    'name' => 'GoBoX',
                    'password' => Hash::make('12345678'),
                    'role' => User::ROLE_ADMIN,
                    'status' => User::STATUS_ACTIVE,
                    'bio' => 'Демо-профиль мастера с единым ледяным приключением.',
                    'email_verified_at' => now(),
                ]
            );

            $this->clearOwnedDemoContent($user);

            $campaign = $this->seedCampaign($user);
            $this->seedCampaignTags($campaign, ['зима', 'маяк', 'лед', 'культ']);
            $items = $this->seedItems($user);
            $scenario = $this->seedScenario($user, $campaign, $items);
            $characters = $this->seedCharacters($user, $campaign, $scenario);

            foreach ($items as $item) {
                $this->linkScenarioMaterial($scenario, EntityLink::TARGET_ITEM, (int) $item->id);
                $this->linkCampaignMaterial($campaign, EntityLink::TARGET_ITEM, (int) $item->id);
            }

            $map = $this->seedMap($user, $campaign, $scenario, $characters, $items);
            $this->linkCampaignMaterial($campaign, EntityLink::TARGET_MAP, (int) $map->id);
        });
    }

    private function clearOwnedDemoContent(User $user): void
    {
        $campaignIds = Campaign::query()->where('user_id', $user->id)->pluck('id');
        $ownedMaterialIds = [
            EntityLink::TARGET_SCENARIO => Scenario::query()->where('user_id', $user->id)->pluck('id'),
            EntityLink::TARGET_MAP => Map::query()->where('user_id', $user->id)->pluck('id'),
            EntityLink::TARGET_CHARACTER => Character::query()->where('user_id', $user->id)->pluck('id'),
            EntityLink::TARGET_ITEM => Item::query()->where('user_id', $user->id)->pluck('id'),
        ];
        $scenarioNodeIds = ScenarioNode::query()
            ->whereIn('scenario_id', $ownedMaterialIds[EntityLink::TARGET_SCENARIO])
            ->pluck('id');

        foreach ($ownedMaterialIds as $type => $ids) {
            if ($ids->isEmpty()) {
                continue;
            }

            EntityLink::query()
                ->where(function ($query) use ($type, $ids): void {
                    $query
                        ->where('source_type', $type)
                        ->whereIn('source_id', $ids);
                })
                ->orWhere(function ($query) use ($type, $ids): void {
                    $query
                        ->where('target_type', $type)
                        ->whereIn('target_id', $ids);
                })
                ->delete();
        }

        if ($scenarioNodeIds->isNotEmpty()) {
            EntityLink::query()
                ->where('source_type', EntityLink::SOURCE_SCENARIO_NODE)
                ->whereIn('source_id', $scenarioNodeIds)
                ->delete();
        }

        if ($campaignIds->isNotEmpty()) {
            EntityLink::query()
                ->where('source_type', EntityLink::TARGET_CAMPAIGN)
                ->whereIn('source_id', $campaignIds)
                ->delete();
            DB::table('taggables')
                ->where('taggable_type', EntityLink::TARGET_CAMPAIGN)
                ->whereIn('taggable_id', $campaignIds)
                ->delete();
        }

        Scenario::query()->where('user_id', $user->id)->delete();
        Map::query()->where('user_id', $user->id)->delete();
        Character::query()->where('user_id', $user->id)->delete();
        Item::query()->where('user_id', $user->id)->delete();
        Campaign::query()->where('user_id', $user->id)->delete();
    }

    private function seedCampaign(User $user): Campaign
    {
        return Campaign::create([
            'user_id' => $user->id,
            'title' => 'Свет над ледяным разломом',
            'description' => 'Короткая северная кампания о последнем маяке, который удерживает вечную метель над ледяным разломом.',
        ]);
    }

    /**
     * @param array<int, string> $names
     */
    private function seedCampaignTags(Campaign $campaign, array $names): void
    {
        foreach ($names as $name) {
            $tag = Tag::query()->firstOrCreate(
                ['user_id' => $campaign->user_id, 'slug' => $name],
                ['name' => $name]
            );
            DB::table('taggables')->insertOrIgnore([
                'tag_id' => $tag->id,
                'taggable_type' => EntityLink::TARGET_CAMPAIGN,
                'taggable_id' => $campaign->id,
            ]);
        }
    }

    /**
     * @return array<string, Item>
     */
    private function seedItems(User $user): array
    {
        $dataset = [
            'warm_potion' => [
                'name' => 'Зелье северного тепла',
                'type' => 'Расходник',
                'rarity' => 'Необычный',
                'description' => 'На час защищает от смертельного холода внутри маяка.',
                'modifiers' => [['stat' => 'ВЫН', 'value' => 2]],
                'weight' => 0.3,
                'value' => 120,
            ],
            'lens_key' => [
                'name' => 'Ключ от линзы маяка',
                'type' => 'Ключевой предмет',
                'rarity' => 'Редкий',
                'description' => 'Медный ключ с руной полярной звезды, открывающий зал главной линзы.',
                'modifiers' => [],
                'weight' => 0.2,
                'value' => 0,
            ],
            'storm_core' => [
                'name' => 'Сердце ледяной бури',
                'type' => 'Артефакт',
                'rarity' => 'Эпический',
                'description' => 'Кристалл культистов, способный погасить или перегрузить рунический двигатель.',
                'modifiers' => [['stat' => 'МДР', 'value' => 2]],
                'weight' => 1.4,
                'value' => 900,
            ],
        ];
        $items = [];

        foreach ($dataset as $key => $payload) {
            $items[$key] = Item::create([
                'user_id' => $user->id,
                ...$payload,
            ]);
        }

        return $items;
    }

    /**
     * @param  array<string, Item>  $items
     */
    private function seedScenario(User $user, Campaign $campaign, array $items): Scenario
    {
        $scenario = Scenario::create([
            'user_id' => $user->id,
            'campaign_id' => $campaign->id,
            'title' => 'Последний огонь ледяного маяка',
            'description' => 'Герои должны пройти нижний ярус маяка, восстановить рунический двигатель и зажечь линзу до прихода ледяной бури.',
        ]);

        $this->seedScenarioGraph($scenario, $this->lighthouseScenarioGraph($items));

        return $scenario->fresh();
    }

    /**
     * @param  array<string, mixed>  $graph
     */
    private function seedScenarioGraph(Scenario $scenario, array $graph): void
    {
        $nodesByKey = [];

        foreach (($graph['nodes'] ?? []) as $nodeIndex => $nodePayload) {
            $node = ScenarioNode::create([
                'scenario_id' => $scenario->id,
                'type' => $nodePayload['type'],
                'title' => $nodePayload['title'] ?? null,
                'content' => $nodePayload['content'] ?? null,
                'position' => $nodePayload['position'] ?? ['x' => 120 + ($nodeIndex * 120), 'y' => 120],
                'config' => $nodePayload['config'] ?? [],
                'order_index' => $nodePayload['order_index'] ?? $nodeIndex,
            ]);

            $nodesByKey[$nodePayload['key']] = $node;
        }

        foreach (($graph['transitions'] ?? []) as $transitionIndex => $transitionPayload) {
            ScenarioTransition::create([
                'scenario_id' => $scenario->id,
                'from_node_id' => $nodesByKey[$transitionPayload['from']]->id,
                'to_node_id' => $nodesByKey[$transitionPayload['to']]->id,
                'type' => $transitionPayload['type'] ?? 'linear',
                'label' => $transitionPayload['label'] ?? null,
                'condition' => $transitionPayload['condition'] ?? [],
                'metadata' => $transitionPayload['metadata'] ?? [],
                'order_index' => $transitionPayload['order_index'] ?? $transitionIndex,
            ]);
        }
    }

    /**
     * @return array<string, array<int, array<string, mixed>>>
     */
    /**
     * @param  array<string, Item>  $items
     */
    private function lighthouseScenarioGraph(array $items): array
    {
        return [
            'nodes' => [
                [
                    'key' => 'arrival',
                    'type' => 'description',
                    'title' => 'Маяк в белой мгле',
                    'content' => 'Герои добираются до маяка за час до прихода великой бури. Ворота обледенели, а сигнальный огонь погас.',
                    'position' => ['x' => 80, 'y' => 180, 'width' => 270, 'height' => 160],
                    'config' => ['scene' => self::MAP_NAME],
                    'order_index' => 0,
                ],
                [
                    'key' => 'keeper',
                    'type' => 'dialog',
                    'title' => 'Последняя смотрительница',
                    'content' => 'Ирма объясняет: культ вырвал сердце двигателя, а без запуска нижнего яруса главная линза останется мертвой.',
                    'position' => ['x' => 450, 'y' => 180, 'width' => 290, 'height' => 170],
                    'config' => ['speaker' => 'Ирма Снежная'],
                    'order_index' => 1,
                ],
                [
                    'key' => 'cache',
                    'type' => 'loot',
                    'title' => 'Аварийный шкаф',
                    'content' => 'Ирма открывает запас: зелье северного тепла и ключ от линзы маяка.',
                    'position' => ['x' => 830, 'y' => 40, 'width' => 270, 'height' => 150],
                    'config' => [
                        'item_hint' => 'Зелье северного тепла и ключ от линзы маяка',
                        'reward_item_ids' => [
                            (string) $items['warm_potion']->id,
                            (string) $items['lens_key']->id,
                        ],
                    ],
                    'order_index' => 2,
                ],
                [
                    'key' => 'engine_hall',
                    'type' => 'location',
                    'title' => 'Зал рунического двигателя',
                    'content' => 'Лед покрывает пол и стены. Через центр зала проходит расколотый ледяной канал, у дальней стены стоит двигатель.',
                    'position' => ['x' => 830, 'y' => 300, 'width' => 300, 'height' => 180],
                    'config' => ['map_hint' => self::MAP_NAME],
                    'order_index' => 3,
                ],
                [
                    'key' => 'restore_runes',
                    'type' => 'check',
                    'title' => 'Восстановить руны',
                    'content' => 'Нужно очистить три замерзшие печати и синхронно направить энергию к двигателю.',
                    'position' => ['x' => 1230, 'y' => 260, 'width' => 300, 'height' => 180],
                    'config' => ['skill' => 'Магия или Выживание', 'dc' => 14],
                    'order_index' => 4,
                ],
                [
                    'key' => 'cult_attack',
                    'type' => 'combat',
                    'title' => 'Хазар выходит из разлома',
                    'content' => 'При провале печати лопаются. Хазар и ледяные прислужники прорываются в зал с сердцем бури.',
                    'position' => ['x' => 1620, 'y' => 430, 'width' => 310, 'height' => 180],
                    'config' => ['encounter' => 'Хазар Безликий и два ледяных прислужника'],
                    'order_index' => 5,
                ],
                [
                    'key' => 'engine_started',
                    'type' => 'location',
                    'title' => 'Двигатель пробуждается',
                    'content' => 'После восстановления рун или победы над культистами герои возвращают сердце бури в стабилизирующую оправу.',
                    'position' => ['x' => 1620, 'y' => 160, 'width' => 310, 'height' => 180],
                    'config' => ['map_hint' => self::MAP_NAME],
                    'order_index' => 6,
                ],
                [
                    'key' => 'align_lens',
                    'type' => 'check',
                    'title' => 'Направить последний луч',
                    'content' => 'Ирма открывает линзу ключом. Герои должны удержать поток энергии и направить его сквозь бурю.',
                    'position' => ['x' => 2030, 'y' => 230, 'width' => 300, 'height' => 180],
                    'config' => ['skill' => 'Магия или Атлетика', 'dc' => 15],
                    'order_index' => 7,
                ],
                [
                    'key' => 'light_finale',
                    'type' => 'description',
                    'title' => 'Луч над разломом',
                    'content' => 'Маяк загорается. Буря расходится вокруг башни, а путь через ледяной разлом снова становится видимым.',
                    'position' => ['x' => 2440, 'y' => 90, 'width' => 300, 'height' => 170],
                    'config' => ['scene' => 'Успешный финал кампании'],
                    'order_index' => 8,
                ],
                [
                    'key' => 'dark_finale',
                    'type' => 'description',
                    'title' => 'Огонь подо льдом',
                    'content' => 'Линза трескается, но маяк дает короткую вспышку. Герои спасаются, зная, что буря вернется следующей ночью.',
                    'position' => ['x' => 2440, 'y' => 390, 'width' => 300, 'height' => 170],
                    'config' => ['scene' => 'Финал с осложнением'],
                    'order_index' => 9,
                ],
            ],
            'transitions' => [
                ['from' => 'arrival', 'to' => 'keeper', 'type' => 'linear', 'label' => 'Войти в маяк', 'order_index' => 0],
                ['from' => 'keeper', 'to' => 'engine_hall', 'type' => 'choice', 'label' => 'Сразу к двигателю', 'order_index' => 1],
                ['from' => 'keeper', 'to' => 'cache', 'type' => 'choice', 'label' => 'Взять аварийный запас', 'order_index' => 2],
                ['from' => 'cache', 'to' => 'engine_hall', 'type' => 'linear', 'label' => 'Спуститься в нижний ярус', 'order_index' => 3],
                ['from' => 'engine_hall', 'to' => 'restore_runes', 'type' => 'linear', 'label' => 'Осмотреть печати', 'order_index' => 4],
                [
                    'from' => 'restore_runes',
                    'to' => 'engine_started',
                    'type' => 'success',
                    'label' => 'Руны восстановлены',
                    'condition' => ['outcome' => 'success', 'dc' => 14],
                    'order_index' => 5,
                ],
                [
                    'from' => 'restore_runes',
                    'to' => 'cult_attack',
                    'type' => 'failure',
                    'label' => 'Печати раскалываются',
                    'condition' => ['outcome' => 'failure', 'dc' => 14],
                    'order_index' => 6,
                ],
                ['from' => 'cult_attack', 'to' => 'engine_started', 'type' => 'linear', 'label' => 'Вернуть сердце бури', 'order_index' => 7],
                ['from' => 'engine_started', 'to' => 'align_lens', 'type' => 'linear', 'label' => 'Поднять энергию к линзе', 'order_index' => 8],
                [
                    'from' => 'align_lens',
                    'to' => 'light_finale',
                    'type' => 'success',
                    'label' => 'Удержать луч',
                    'condition' => ['outcome' => 'success', 'dc' => 15],
                    'order_index' => 9,
                ],
                [
                    'from' => 'align_lens',
                    'to' => 'dark_finale',
                    'type' => 'failure',
                    'label' => 'Линза не выдерживает',
                    'condition' => ['outcome' => 'failure', 'dc' => 15],
                    'order_index' => 10,
                ],
            ],
        ];
    }

    /**
     * @return array<string, Character>
     */
    private function seedCharacters(User $user, Campaign $campaign, Scenario $scenario): array
    {
        $dataset = [
            'torstein' => [
                'name' => 'Торстейн Ледоруб',
                'role' => 'Герой',
                'race' => 'Дварф',
                'description' => 'Воин северного дозора, который провел отряд через метель к маяку.',
                'stats' => ['АТК' => 14, 'ЗАЩ' => 15, 'СИЛ' => 14, 'ЛОВ' => 9, 'ВЫН' => 15, 'ИНТ' => 10, 'МДР' => 11, 'ХАР' => 10, 'УДЧ' => 8],
            ],
            'irma' => [
                'name' => 'Ирма Снежная',
                'role' => 'NPC',
                'race' => 'Человек',
                'description' => 'Последняя смотрительница маяка и хранительница ключа от главной линзы.',
                'stats' => ['АТК' => 7, 'ЗАЩ' => 9, 'СИЛ' => 8, 'ЛОВ' => 10, 'ВЫН' => 11, 'ИНТ' => 15, 'МДР' => 14, 'ХАР' => 13, 'УДЧ' => 11],
            ],
            'hazar' => [
                'name' => 'Хазар Безликий',
                'role' => 'Монстр',
                'race' => 'Ледяной культист',
                'description' => 'Предводитель культистов, пытающийся навсегда погасить маяк над разломом.',
                'stats' => ['АТК' => 16, 'ЗАЩ' => 13, 'СИЛ' => 15, 'ЛОВ' => 12, 'ВЫН' => 14, 'ИНТ' => 9, 'МДР' => 8, 'ХАР' => 6, 'УДЧ' => 10],
            ],
        ];
        $characters = [];

        foreach ($dataset as $key => $payload) {
            $characters[$key] = Character::create([
                'user_id' => $user->id,
                'name' => $payload['name'],
                'role' => $payload['role'],
                'race' => $payload['race'],
                'description' => $payload['description'],
                'stats' => $payload['stats'],
                'inventory' => [],
            ]);

            $this->linkScenarioMaterial(
                $scenario,
                EntityLink::TARGET_CHARACTER,
                (int) $characters[$key]->id
            );
            $this->linkCampaignMaterial(
                $campaign,
                EntityLink::TARGET_CHARACTER,
                (int) $characters[$key]->id
            );
        }

        return $characters;
    }

    /**
     * @param  array<string, Character>  $characters
     * @param  array<string, Item>  $items
     */
    private function seedMap(
        User $user,
        Campaign $campaign,
        Scenario $scenario,
        array $characters,
        array $items
    ): Map {
        $width = 24;
        $height = 16;
        $tileObjects = $this->buildIceMapTiles($width, $height);
        $tokenObjects = [
            $this->cardToken('token-torstein', 5, 10, EntityLink::TARGET_CHARACTER, $characters['torstein'], '#FFC300'),
            $this->cardToken('token-irma', 5, 4, EntityLink::TARGET_CHARACTER, $characters['irma'], '#FFC300'),
            $this->cardToken('token-hazar', 18, 8, EntityLink::TARGET_CHARACTER, $characters['hazar'], '#E63946'),
            $this->cardToken('token-storm-core', 20, 8, EntityLink::TARGET_ITEM, $items['storm_core'], '#8338EC'),
        ];
        $layers = [
            [
                'id' => 'background',
                'type' => 'background',
                'name' => 'ФОН',
                'visible' => true,
                'locked' => false,
                'opacity' => 1,
                'order' => 0,
                'objects' => [],
            ],
            [
                'id' => 'tiles',
                'type' => 'tiles',
                'name' => 'ЛЕДЯНОЙ КАМЕНЬ',
                'visible' => true,
                'locked' => false,
                'opacity' => 1,
                'order' => 1,
                'objects' => $tileObjects,
            ],
            [
                'id' => 'tokens',
                'type' => 'tokens',
                'name' => 'УЧАСТНИКИ СЦЕНЫ',
                'visible' => true,
                'locked' => false,
                'opacity' => 1,
                'order' => 2,
                'objects' => $tokenObjects,
            ],
        ];

        $map = Map::create([
            'user_id' => $user->id,
            'name' => self::MAP_NAME,
            'width' => $width,
            'height' => $height,
            'cell_size' => 32,
            'data' => [
                'backgroundAssetId' => null,
                'layers' => $layers,
                'objects' => collect([$tileObjects, $tokenObjects])
                    ->flatten(1)
                    ->values()
                    ->all(),
            ],
        ]);

        $this->linkScenarioMaterial($scenario, EntityLink::TARGET_MAP, (int) $map->id);

        return $map;
    }

    /**
     * @return array<int, array<string, mixed>>
     */
    private function buildIceMapTiles(int $width, int $height): array
    {
        $objects = [];

        for ($y = 0; $y < $height; $y++) {
            for ($x = 0; $x < $width; $x++) {
                $isBorder = $x === 0 || $y === 0 || $x === $width - 1 || $y === $height - 1;
                $isIceChannel = ! $isBorder
                    && (
                        ($x >= 10 && $x <= 13)
                        || ($y === 8 && $x >= 7 && $x <= 19)
                    );
                $assetId = $isBorder
                    ? self::TILE_FROZEN_WALL
                    : ($isIceChannel ? self::TILE_ICE : self::TILE_FROZEN_FLOOR);
                $type = $isBorder ? 'wall' : 'floor';

                $objects[] = [
                    'id' => "tile-{$x}-{$y}",
                    'x' => $x,
                    'y' => $y,
                    'width' => 1,
                    'height' => 1,
                    'rotation' => 0,
                    'opacity' => 1,
                    'type' => $type,
                    'label' => $isBorder ? 'Каменная стена во льду' : ($isIceChannel ? 'Лёд' : 'Каменный пол во льду'),
                    'color' => $isBorder ? '#8ba7b8' : ($isIceChannel ? '#9ed2ed' : '#829cad'),
                    'sourceType' => EntityLink::TARGET_ASSET,
                    'sourceId' => $assetId,
                    'assetId' => $assetId,
                    'layerId' => 'tiles',
                ];
            }
        }

        return $objects;
    }

    /**
     * @return array<string, mixed>
     */
    private function cardToken(
        string $id,
        int $x,
        int $y,
        string $sourceType,
        Character|Item $material,
        string $color
    ): array {
        return [
            'id' => $id,
            'x' => $x,
            'y' => $y,
            'width' => 1,
            'height' => 1,
            'rotation' => 0,
            'opacity' => 1,
            'type' => $sourceType,
            'label' => $material->name,
            'color' => $color,
            'sourceType' => $sourceType,
            'sourceId' => (string) $material->id,
            'assetId' => null,
            'layerId' => 'tokens',
        ];
    }

    private function linkScenarioMaterial(Scenario $scenario, string $targetType, int $targetId): void
    {
        EntityLink::create([
            'source_type' => EntityLink::TARGET_SCENARIO,
            'source_id' => $scenario->id,
            'target_type' => $targetType,
            'target_id' => $targetId,
            'relation_type' => EntityLink::RELATION_USES,
            'label' => null,
            'metadata' => null,
        ]);
    }

    private function linkCampaignMaterial(Campaign $campaign, string $targetType, int $targetId): void
    {
        EntityLink::create([
            'source_type' => EntityLink::TARGET_CAMPAIGN,
            'source_id' => $campaign->id,
            'target_type' => $targetType,
            'target_id' => $targetId,
            'relation_type' => EntityLink::RELATION_USES,
            'label' => null,
            'metadata' => null,
        ]);
    }
}
