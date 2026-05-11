<?php

namespace Database\Seeders;

use App\Models\Campaign;
use App\Models\Character;
use App\Models\Item;
use App\Models\Map;
use App\Models\Scenario;
use App\Models\ScenarioNode;
use App\Models\ScenarioTransition;
use App\Models\User;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;

class GoBoxContentSeeder extends Seeder
{
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
                    'bio' => 'Демо-профиль мастера для локальной проверки редакторов.',
                    'email_verified_at' => now(),
                ]
            );

            $campaigns = $this->seedCampaigns($user);
            $items = $this->seedItems($user);
            $scenarios = $this->seedScenarios($user, $campaigns);
            $this->seedMaps($user, $campaigns, $scenarios);
            $this->seedCharacters($user, $campaigns, $scenarios, $items);
        });
    }

    /**
     * @return array<string, Campaign>
     */
    private function seedCampaigns(User $user): array
    {
        $dataset = [
            'frost' => [
                'title' => 'Хроники ледяного пика',
                'description' => 'Северные племена пытаются остановить культ ледяного шторма и снова зажечь старый маяк.',
                'tags' => ['зима', 'племена', 'маяк', 'культ'],
                'resources' => ['Карта ледяного маяка', 'Список дозорных', 'Легенды о северном шторме'],
                'progress' => 35,
                'last_played' => '2026-02-12',
            ],
            'dunes' => [
                'title' => 'Пески Караму',
                'description' => 'Караваны исчезают в пустыне, а древние руины просыпаются под барханами.',
                'tags' => ['пустыня', 'караваны', 'руины'],
                'resources' => ['Маршрут каравана', 'Список фракций оазиса'],
                'progress' => 20,
                'last_played' => '2026-02-03',
            ],
            'depths' => [
                'title' => 'Архив под бездной',
                'description' => 'Подземный комплекс, где магия и механизмы вышли из-под контроля.',
                'tags' => ['подземелье', 'архив', 'магия'],
                'resources' => ['Схема нижнего уровня', 'Дневник архивариуса'],
                'progress' => 15,
                'last_played' => '2026-01-28',
            ],
        ];

        $campaigns = [];

        foreach ($dataset as $key => $payload) {
            $campaigns[$key] = Campaign::updateOrCreate(
                [
                    'user_id' => $user->id,
                    'title' => $payload['title'],
                ],
                [
                    'description' => $payload['description'],
                    'tags' => $payload['tags'],
                    'resources' => $payload['resources'],
                    'progress' => $payload['progress'],
                    'last_played' => $payload['last_played'],
                ]
            );
        }

        return $campaigns;
    }

    /**
     * @return array<string, Item>
     */
    private function seedItems(User $user): array
    {
        $dataset = [
            'sun_blade' => [
                'name' => 'Клинок рассвета',
                'type' => 'Оружие',
                'rarity' => 'Эпический',
                'description' => 'Меч, который ярче горит на открытом воздухе и режет ледяную броню.',
                'modifiers' => [
                    ['stat' => 'АТК', 'value' => 4],
                    ['stat' => 'ХАР', 'value' => 1],
                ],
                'weight' => 2.8,
                'value' => 950,
            ],
            'warm_potion' => [
                'name' => 'Зелье тепла',
                'type' => 'Расходник',
                'rarity' => 'Необычный',
                'description' => 'На час защищает от холода и помогает пережить ледяной шторм.',
                'modifiers' => [
                    ['stat' => 'ВЫН', 'value' => 2],
                ],
                'weight' => 0.3,
                'value' => 120,
            ],
            'lens_key' => [
                'name' => 'Ключ от линзы',
                'type' => 'Ключевой предмет',
                'rarity' => 'Редкий',
                'description' => 'Медный ключ с руной маяка. Открывает верхний ярус и блокировку линзы.',
                'modifiers' => [],
                'weight' => 0.2,
                'value' => 0,
            ],
            'ice_totem' => [
                'name' => 'Тотем стужи',
                'type' => 'Артефакт',
                'rarity' => 'Легендарный',
                'description' => 'Стабилизирует температуру и рассеивает метель вокруг носителя.',
                'modifiers' => [
                    ['stat' => 'ВЫН', 'value' => 3],
                    ['stat' => 'МДР', 'value' => 2],
                ],
                'weight' => 4.1,
                'value' => 1700,
            ],
            'mercenary_kit' => [
                'name' => 'Набор наемника',
                'type' => 'Снаряжение',
                'rarity' => 'Обычный',
                'description' => 'Веревка, крюки, масло и базовые инструменты для полевого выхода.',
                'modifiers' => [],
                'weight' => 5.5,
                'value' => 130,
            ],
        ];

        $items = [];

        foreach ($dataset as $key => $payload) {
            $items[$key] = Item::updateOrCreate(
                [
                    'user_id' => $user->id,
                    'name' => $payload['name'],
                ],
                [
                    'type' => $payload['type'],
                    'rarity' => $payload['rarity'],
                    'description' => $payload['description'],
                    'modifiers' => $payload['modifiers'],
                    'weight' => $payload['weight'],
                    'value' => $payload['value'],
                ]
            );
        }

        return $items;
    }

    /**
     * @param array<string, Campaign> $campaigns
     * @return array<string, Scenario>
     */
    private function seedScenarios(User $user, array $campaigns): array
    {
        Scenario::query()
            ->where('user_id', $user->id)
            ->delete();

        $scenario = Scenario::create([
            'user_id' => $user->id,
            'title' => 'Петля ледяного маяка',
            'description' => 'Демонстрационный graph-сценарий: проверка, развилки, успех и провал, добыча, бой, обратные переходы и несколько путей к финалу.',
            'campaign_id' => $campaigns['frost']->id ?? null,
        ]);

        $this->seedScenarioGraph($scenario, $this->demoShowcaseScenarioGraph());

        return [
            'demo_graph_showcase' => $scenario->fresh(),
        ];
    }

    /**
     * @param array<string, mixed> $graph
     */
    private function seedScenarioGraph(Scenario $scenario, array $graph): void
    {
        $scenario->transitions()->delete();
        $scenario->nodes()->delete();

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
            $fromNode = $nodesByKey[$transitionPayload['from']] ?? null;
            $toNode = $nodesByKey[$transitionPayload['to']] ?? null;

            if (!$fromNode || !$toNode) {
                continue;
            }

            ScenarioTransition::create([
                'scenario_id' => $scenario->id,
                'from_node_id' => $fromNode->id,
                'to_node_id' => $toNode->id,
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
    private function demoShowcaseScenarioGraph(): array
    {
        return [
            'nodes' => [
                [
                    'key' => 'briefing',
                    'type' => 'description',
                    'title' => 'Брифинг у ледяного маяка',
                    'content' => 'Северный дозор просит героев запустить маяк до полуночи. За стенами ревет шторм, а внизу уже видны огни культистов.',
                    'position' => ['x' => 80, 'y' => 140, 'width' => 260, 'height' => 150],
                    'config' => ['scene' => 'Ледяной маяк на краю разлома'],
                    'order_index' => 0,
                ],
                [
                    'key' => 'keeper_dialog',
                    'type' => 'dialog',
                    'title' => 'Разговор со смотрителем',
                    'content' => 'Смотритель Ирма знает старый обходной ход, но требует пообещать, что герои спасут плененных дозорных.',
                    'position' => ['x' => 460, 'y' => 90, 'width' => 280, 'height' => 160],
                    'config' => ['speaker' => 'Смотритель Ирма'],
                    'order_index' => 1,
                ],
                [
                    'key' => 'courtyard',
                    'type' => 'location',
                    'title' => 'Двор маяка',
                    'content' => 'Во дворе занесенные снегом ворота, разбитый подъемник и три рунические плиты, которые питают линзу маяка.',
                    'position' => ['x' => 860, 'y' => 120, 'width' => 280, 'height' => 170],
                    'config' => ['map_hint' => 'Карта: двор и наружная площадка маяка'],
                    'order_index' => 2,
                ],
                [
                    'key' => 'rune_check',
                    'type' => 'check',
                    'title' => 'Проверка рунических плит',
                    'content' => 'Нужно удержать три руны одновременно. Помехи шторма делают проверку опасной: провал привлекает культистов.',
                    'position' => ['x' => 1240, 'y' => 70, 'width' => 300, 'height' => 180],
                    'config' => ['skill' => 'Магия или Выживание', 'dc' => 14],
                    'order_index' => 3,
                ],
                [
                    'key' => 'lens_hall',
                    'type' => 'location',
                    'title' => 'Зал линз',
                    'content' => 'Верхний ярус маяка. Здесь можно направить луч, если герои успели стабилизировать руны.',
                    'position' => ['x' => 1640, 'y' => 40, 'width' => 280, 'height' => 150],
                    'config' => ['map_hint' => 'Карта: верхний ярус и линза маяка'],
                    'order_index' => 4,
                ],
                [
                    'key' => 'cult_ambush',
                    'type' => 'combat',
                    'title' => 'Засада культистов',
                    'content' => 'Культисты ледяного шторма пытаются сорвать запуск маяка. Бой можно выиграть или отступить к рунам.',
                    'position' => ['x' => 1260, 'y' => 390, 'width' => 300, 'height' => 180],
                    'config' => ['encounter' => '2 культиста, ледяной зверь, опасная зона шторма'],
                    'order_index' => 5,
                ],
                [
                    'key' => 'keeper_cache',
                    'type' => 'loot',
                    'title' => 'Тайник смотрителя',
                    'content' => 'За старой печью лежат зелье тепла, ключ от линзы и сигнальный кристалл.',
                    'position' => ['x' => 850, 'y' => 420, 'width' => 260, 'height' => 150],
                    'config' => ['item_hint' => 'Зелье тепла, ключ от линзы, сигнальный кристалл'],
                    'order_index' => 6,
                ],
                [
                    'key' => 'retreat',
                    'type' => 'description',
                    'title' => 'Отступление к воротам',
                    'content' => 'Герои могут перегруппироваться у ворот, потратить ресурсы и снова выбрать путь через двор или к смотрителю.',
                    'position' => ['x' => 480, 'y' => 430, 'width' => 280, 'height' => 160],
                    'config' => ['scene' => 'Короткая передышка и обратный переход'],
                    'order_index' => 7,
                ],
                [
                    'key' => 'finale',
                    'type' => 'description',
                    'title' => 'Маяк снова горит',
                    'content' => 'Луч маяка разрывает шторм. Дозорные спасены, но культисты оставляют знак: это была только первая попытка.',
                    'position' => ['x' => 2020, 'y' => 190, 'width' => 300, 'height' => 170],
                    'config' => ['scene' => 'Финал сценария и крючок продолжения'],
                    'order_index' => 8,
                ],
            ],
            'transitions' => [
                ['from' => 'briefing', 'to' => 'keeper_dialog', 'type' => 'linear', 'label' => 'Получить вводную', 'condition' => [], 'order_index' => 0],
                ['from' => 'keeper_dialog', 'to' => 'courtyard', 'type' => 'choice', 'label' => 'Осмотреть двор', 'condition' => [], 'order_index' => 0],
                ['from' => 'keeper_dialog', 'to' => 'keeper_cache', 'type' => 'choice', 'label' => 'Попросить снаряжение', 'condition' => [], 'order_index' => 1],
                ['from' => 'keeper_cache', 'to' => 'courtyard', 'type' => 'linear', 'label' => 'Вернуться во двор', 'condition' => [], 'order_index' => 0],
                ['from' => 'courtyard', 'to' => 'rune_check', 'type' => 'linear', 'label' => 'Запустить руны', 'condition' => [], 'order_index' => 0],
                ['from' => 'rune_check', 'to' => 'lens_hall', 'type' => 'success', 'label' => 'Руны стабилизированы', 'condition' => ['outcome' => 'success', 'dc' => 14], 'order_index' => 0],
                ['from' => 'rune_check', 'to' => 'cult_ambush', 'type' => 'failure', 'label' => 'Шторм срывает ритуал', 'condition' => ['outcome' => 'failure', 'dc' => 14], 'order_index' => 1],
                ['from' => 'lens_hall', 'to' => 'cult_ambush', 'type' => 'choice', 'label' => 'Спуститься к культистам', 'condition' => [], 'order_index' => 0],
                ['from' => 'cult_ambush', 'to' => 'rune_check', 'type' => 'choice', 'label' => 'Отступить к рунам', 'condition' => [], 'order_index' => 0],
                ['from' => 'cult_ambush', 'to' => 'finale', 'type' => 'linear', 'label' => 'Запустить линзу', 'condition' => [], 'order_index' => 1],
                ['from' => 'cult_ambush', 'to' => 'retreat', 'type' => 'choice', 'label' => 'Отойти и перегруппироваться', 'condition' => [], 'order_index' => 2],
                ['from' => 'retreat', 'to' => 'keeper_dialog', 'type' => 'choice', 'label' => 'Снова поговорить со смотрителем', 'condition' => [], 'order_index' => 0],
                ['from' => 'finale', 'to' => 'keeper_dialog', 'type' => 'choice', 'label' => 'Спросить о последствиях', 'condition' => [], 'order_index' => 0],
            ],
        ];
    }

    /**
     * @param array<string, Campaign> $campaigns
     * @param array<string, Scenario> $scenarios
     */
    private function seedMaps(User $user, array $campaigns, array $scenarios): void
    {
        $dataset = [
            [
                'name' => 'Двор ледяного маяка',
                'campaign_key' => 'frost',
                'scenario_key' => 'demo_graph_showcase',
                'width' => 30,
                'height' => 20,
                'cell_size' => 32,
                'objects' => $this->buildMapObjects(30, 20, 'frost'),
            ],
            [
                'name' => 'Зал линз',
                'campaign_key' => 'frost',
                'scenario_key' => 'demo_graph_showcase',
                'width' => 24,
                'height' => 18,
                'cell_size' => 32,
                'objects' => $this->buildMapObjects(24, 18, 'dungeon'),
            ],
            [
                'name' => 'Оазис Караму',
                'campaign_key' => 'dunes',
                'scenario_key' => 'demo_graph_showcase',
                'width' => 28,
                'height' => 20,
                'cell_size' => 32,
                'objects' => $this->buildMapObjects(28, 20, 'sand'),
            ],
            [
                'name' => 'Разлом шахты',
                'campaign_key' => 'depths',
                'scenario_key' => 'demo_graph_showcase',
                'width' => 26,
                'height' => 22,
                'cell_size' => 32,
                'objects' => $this->buildMapObjects(26, 22, 'abyss'),
            ],
        ];

        foreach ($dataset as $payload) {
            Map::updateOrCreate(
                [
                    'user_id' => $user->id,
                    'name' => $payload['name'],
                ],
                [
                    'campaign_id' => $campaigns[$payload['campaign_key']]->id ?? null,
                    'scenario_id' => $scenarios[$payload['scenario_key']]->id ?? null,
                    'width' => $payload['width'],
                    'height' => $payload['height'],
                    'cell_size' => $payload['cell_size'],
                    'data' => ['objects' => $payload['objects']],
                ]
            );
        }
    }

    /**
     * @param array<string, Campaign> $campaigns
     * @param array<string, Scenario> $scenarios
     * @param array<string, Item> $items
     */
    private function seedCharacters(User $user, array $campaigns, array $scenarios, array $items): void
    {
        $dataset = [
            [
                'name' => 'Торстейн Ледоруб',
                'role' => 'Герой',
                'race' => 'Дварф',
                'description' => 'Воин дозора, который знает старые тропы к маяку и не доверяет смотрителю.',
                'level' => 6,
                'stats' => ['АТК' => 14, 'ЗАЩ' => 15, 'СИЛ' => 14, 'ЛОВ' => 9, 'ВЫН' => 15, 'ИНТ' => 10, 'МДР' => 11, 'ХАР' => 10, 'УДЧ' => 8],
                'inventory_keys' => ['ice_totem', 'mercenary_kit'],
                'campaign_key' => 'frost',
                'scenario_key' => 'demo_graph_showcase',
            ],
            [
                'name' => 'Ирма Снежная',
                'role' => 'NPC',
                'race' => 'Человек',
                'description' => 'Смотритель маяка. Скрывает вину за прошлый провал ритуала.',
                'level' => 4,
                'stats' => ['АТК' => 7, 'ЗАЩ' => 9, 'СИЛ' => 8, 'ЛОВ' => 10, 'ВЫН' => 11, 'ИНТ' => 15, 'МДР' => 14, 'ХАР' => 13, 'УДЧ' => 11],
                'inventory_keys' => ['lens_key', 'warm_potion'],
                'campaign_key' => 'frost',
                'scenario_key' => 'demo_graph_showcase',
            ],
            [
                'name' => 'Хазар Безликий',
                'role' => 'Монстр',
                'race' => 'Теневая сущность',
                'description' => 'Культист, который питается страхом дозорных и открывает путь ледяному зверю.',
                'level' => 7,
                'stats' => ['АТК' => 16, 'ЗАЩ' => 13, 'СИЛ' => 15, 'ЛОВ' => 12, 'ВЫН' => 14, 'ИНТ' => 9, 'МДР' => 8, 'ХАР' => 6, 'УДЧ' => 10],
                'inventory_keys' => [],
                'campaign_key' => 'frost',
                'scenario_key' => 'demo_graph_showcase',
            ],
            [
                'name' => 'Сайра Песчаный Шаг',
                'role' => 'Герой',
                'race' => 'Человек',
                'description' => 'Следопыт караванов. В демо используется как пример персонажа из другой кампании.',
                'level' => 5,
                'stats' => ['АТК' => 13, 'ЗАЩ' => 11, 'СИЛ' => 10, 'ЛОВ' => 14, 'ВЫН' => 12, 'ИНТ' => 11, 'МДР' => 12, 'ХАР' => 10, 'УДЧ' => 9],
                'inventory_keys' => ['sun_blade', 'mercenary_kit'],
                'campaign_key' => 'dunes',
                'scenario_key' => 'demo_graph_showcase',
            ],
        ];

        foreach ($dataset as $payload) {
            $inventory = [];

            foreach ($payload['inventory_keys'] as $itemKey) {
                if (isset($items[$itemKey])) {
                    $inventory[] = (int) $items[$itemKey]->id;
                }
            }

            Character::updateOrCreate(
                [
                    'user_id' => $user->id,
                    'name' => $payload['name'],
                ],
                [
                    'role' => $payload['role'],
                    'race' => $payload['race'],
                    'description' => $payload['description'],
                    'level' => $payload['level'],
                    'stats' => $payload['stats'],
                    'inventory' => $inventory,
                    'campaign_id' => $campaigns[$payload['campaign_key']]->id ?? null,
                    'scenario_id' => $scenarios[$payload['scenario_key']]->id ?? null,
                ]
            );
        }
    }

    /**
     * @return array<int, array<string, int|string>>
     */
    private function buildMapObjects(int $width, int $height, string $theme): array
    {
        $objects = [];

        for ($x = 0; $x < $width; $x++) {
            $objects[] = $this->obj("wall-top-{$x}", $x, 0, 'wall', 'Стена', '#8A8F98');
            $objects[] = $this->obj("wall-bottom-{$x}", $x, $height - 1, 'wall', 'Стена', '#8A8F98');
        }

        for ($y = 1; $y < $height - 1; $y++) {
            $objects[] = $this->obj("wall-left-{$y}", 0, $y, 'wall', 'Стена', '#8A8F98');
            $objects[] = $this->obj("wall-right-{$y}", $width - 1, $y, 'wall', 'Стена', '#8A8F98');
        }

        for ($x = 2; $x < $width - 2; $x += 2) {
            $y = (int) floor($height / 2);

            if ($theme === 'sand') {
                $objects[] = $this->obj("sand-{$x}", $x, $y, 'floor', 'Песок', '#9C7A52');
            } elseif ($theme === 'dungeon') {
                $objects[] = $this->obj("dungeon-{$x}", $x, $y, 'loot', 'Руны', '#8338EC');
            } elseif ($theme === 'abyss') {
                $objects[] = $this->obj("abyss-{$x}", $x, $y, 'lava', 'Разлом', '#E63946');
            } else {
                $objects[] = $this->obj("frost-{$x}", $x, $y, 'water', 'Лед', '#7CB7E5');
            }
        }

        $objects[] = $this->obj('npc-center', (int) floor($width / 2), (int) floor($height / 2) - 2, 'npc', 'NPC', '#FFC300');

        return $objects;
    }

    /**
     * @return array<string, int|string>
     */
    private function obj(string $id, int $x, int $y, string $type, string $label, string $color): array
    {
        return [
            'id' => $id,
            'x' => $x,
            'y' => $y,
            'type' => $type,
            'label' => $label,
            'color' => $color,
        ];
    }
}
