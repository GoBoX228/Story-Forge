<?php

namespace Database\Seeders;

use App\Models\Block;
use App\Models\Campaign;
use App\Models\Chapter;
use App\Models\Character;
use App\Models\Item;
use App\Models\Map;
use App\Models\Scenario;
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
                    'bio' => 'GM profile seeded by GoBoxContentSeeder.',
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
            'dunes' => [
                'title' => 'Закат пылающих песков',
                'description' => 'Караваны исчезают, и древние руины пробуждаются под барханами.',
                'tags' => ['desert', 'mystery', 'survival'],
                'resources' => ['Карта караванных путей', 'Список фракций оазиса'],
                'progress' => 45,
                'last_played' => '2026-02-10',
            ],
            'depths' => [
                'title' => 'Тени бездны',
                'description' => 'Экспедиция в подземные залы, где магия и механизмы вышли из-под контроля.',
                'tags' => ['dungeon', 'horror', 'arcana'],
                'resources' => ['Схема нижнего уровня', 'Дневник архимага'],
                'progress' => 30,
                'last_played' => '2026-02-08',
            ],
            'frost' => [
                'title' => 'Хроники ледяного пика',
                'description' => 'Северные племена просят помощи против культа, пробуждающего штормы.',
                'tags' => ['winter', 'tribes', 'epic'],
                'resources' => ['Маршрут перевала', 'Тотемные легенды'],
                'progress' => 18,
                'last_played' => '2026-02-05',
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
                'description' => 'Меч, усиливающийся на открытом солнце.',
                'modifiers' => [
                    ['stat' => 'АТК', 'value' => 4],
                    ['stat' => 'ХАР', 'value' => 1],
                ],
                'weight' => 2.8,
                'value' => 950,
            ],
            'sand_cloak' => [
                'name' => 'Плащ дюн',
                'type' => 'Броня',
                'rarity' => 'Редкий',
                'description' => 'Поглощает часть урона от дальних атак.',
                'modifiers' => [
                    ['stat' => 'ЗАЩ', 'value' => 3],
                    ['stat' => 'ЛОВ', 'value' => 1],
                ],
                'weight' => 3.4,
                'value' => 620,
            ],
            'arcane_lantern' => [
                'name' => 'Арканный фонарь',
                'type' => 'Инструмент',
                'rarity' => 'Необычный',
                'description' => 'Подсвечивает скрытые руны и ловушки.',
                'modifiers' => [
                    ['stat' => 'ИНТ', 'value' => 2],
                ],
                'weight' => 1.2,
                'value' => 280,
            ],
            'ice_totem' => [
                'name' => 'Тотем стужи',
                'type' => 'Артефакт',
                'rarity' => 'Легендарный',
                'description' => 'Стабилизирует температуру и рассеивает метели.',
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
                'description' => 'Веревка, крюки, масло и базовые инструменты.',
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
        $dataset = [
            'whispering_sands' => [
                'title' => 'Шепот древних песков',
                'description' => 'Команда героев сопровождает караван и находит вход в затерянный храм.',
                'campaign_key' => 'dunes',
                'chapters' => [
                    [
                        'title' => 'Оазис на рассвете',
                        'blocks' => [
                            ['type' => 'Описание', 'content' => 'Игроки прибывают в оазис Кхарум перед отправкой каравана.'],
                            ['type' => 'Диалог', 'content' => 'Старейшина просит защитить груз от пустынных рейдеров.'],
                            ['type' => 'Проверка', 'content' => 'Проверка внимательности для обнаружения слежки.', 'difficulty' => 12],
                        ],
                    ],
                    [
                        'title' => 'Погребенный храм',
                        'blocks' => [
                            ['type' => 'Локация', 'content' => 'Под барханом открывается лестница в храм Астар.'],
                            ['type' => 'Бой', 'content' => 'Засада песчаных стражей у входной арки.'],
                            ['type' => 'Добыча', 'content' => 'В саркофаге найден ключ и карта нижних залов.'],
                        ],
                    ],
                ],
            ],
            'vault_of_echoes' => [
                'title' => 'Ночь в поместье Блэквуд',
                'description' => 'Расследование убийства, связанного с артефактом голоса.',
                'campaign_key' => 'depths',
                'chapters' => [
                    [
                        'title' => 'Прием в поместье',
                        'blocks' => [
                            ['type' => 'Описание', 'content' => 'Дворянский прием прерывается внезапным отключением света.'],
                            ['type' => 'Диалог', 'content' => 'Хозяйка дома обвиняет в саботаже конкурирующий род.'],
                        ],
                    ],
                    [
                        'title' => 'Подземный архив',
                        'blocks' => [
                            ['type' => 'Локация', 'content' => 'Секретный спуск ведет в архив с аномальными кристаллами.'],
                            ['type' => 'Проверка', 'content' => 'Проверка интеллекта для расшифровки кристаллических заметок.', 'difficulty' => 14],
                            ['type' => 'Бой', 'content' => 'Библиотечный страж оживает и атакует группу.'],
                        ],
                    ],
                ],
            ],
            'abyssal_threshold' => [
                'title' => 'Порог бездны',
                'description' => 'Экспедиция в шахты, где разлом искажает реальность.',
                'campaign_key' => 'depths',
                'chapters' => [
                    [
                        'title' => 'Сломанный подъемник',
                        'blocks' => [
                            ['type' => 'Локация', 'content' => 'Команда чинит подъемник на краю шахты.'],
                            ['type' => 'Проверка', 'content' => 'Проверка силы или инструментов для запуска механизма.', 'difficulty' => 11],
                        ],
                    ],
                    [
                        'title' => 'Сердце разлома',
                        'blocks' => [
                            ['type' => 'Описание', 'content' => 'В центре шахты пульсирует темный кристалл.'],
                            ['type' => 'Бой', 'content' => 'Появляются тени-отражения каждого персонажа.'],
                            ['type' => 'Добыча', 'content' => 'Стабилизированный осколок кристалла ценен для гильдии магов.'],
                        ],
                    ],
                ],
            ],
            'frostbound_path' => [
                'title' => 'Клятва северного дозора',
                'description' => 'Племена объединяются, чтобы остановить культ ледяного шторма.',
                'campaign_key' => 'frost',
                'chapters' => [
                    [
                        'title' => 'Сбор союзников',
                        'blocks' => [
                            ['type' => 'Диалог', 'content' => 'Вождь клана требует доказать верность через испытание.'],
                            ['type' => 'Проверка', 'content' => 'Проверка харизмы на переговорах между кланами.', 'difficulty' => 13],
                        ],
                    ],
                    [
                        'title' => 'Храм белой бури',
                        'blocks' => [
                            ['type' => 'Локация', 'content' => 'Ледяной храм окружен рунами, усиливающими метель.'],
                            ['type' => 'Бой', 'content' => 'Культисты и шаман холода защищают алтарь.'],
                        ],
                    ],
                ],
            ],
        ];

        $scenarios = [];

        foreach ($dataset as $key => $payload) {
            $scenario = Scenario::updateOrCreate(
                [
                    'user_id' => $user->id,
                    'title' => $payload['title'],
                ],
                [
                    'description' => $payload['description'],
                    'campaign_id' => $campaigns[$payload['campaign_key']]->id ?? null,
                ]
            );

            // Keep seeder idempotent with deterministic chapter/block content.
            $scenario->chapters()->delete();

            foreach ($payload['chapters'] as $chapterIndex => $chapterPayload) {
                $chapter = Chapter::create([
                    'scenario_id' => $scenario->id,
                    'title' => $chapterPayload['title'],
                    'order_index' => $chapterIndex,
                ]);

                foreach ($chapterPayload['blocks'] as $blockIndex => $blockPayload) {
                    Block::create([
                        'chapter_id' => $chapter->id,
                        'type' => $blockPayload['type'],
                        'content' => $blockPayload['content'],
                        'order_index' => $blockIndex,
                        'difficulty' => $blockPayload['difficulty'] ?? null,
                    ]);
                }
            }

            $scenarios[$key] = $scenario->fresh();
        }

        return $scenarios;
    }

    /**
     * @param array<string, Campaign> $campaigns
     * @param array<string, Scenario> $scenarios
     */
    private function seedMaps(User $user, array $campaigns, array $scenarios): void
    {
        $dataset = [
            [
                'name' => 'Оазис Кхарум',
                'campaign_key' => 'dunes',
                'scenario_key' => 'whispering_sands',
                'width' => 28,
                'height' => 20,
                'cell_size' => 32,
                'objects' => $this->buildMapObjects(28, 20, 'sand'),
            ],
            [
                'name' => 'Подземный архив',
                'campaign_key' => 'depths',
                'scenario_key' => 'vault_of_echoes',
                'width' => 24,
                'height' => 18,
                'cell_size' => 32,
                'objects' => $this->buildMapObjects(24, 18, 'dungeon'),
            ],
            [
                'name' => 'Разлом шахты',
                'campaign_key' => 'depths',
                'scenario_key' => 'abyssal_threshold',
                'width' => 26,
                'height' => 22,
                'cell_size' => 32,
                'objects' => $this->buildMapObjects(26, 22, 'abyss'),
            ],
            [
                'name' => 'Храм белой бури',
                'campaign_key' => 'frost',
                'scenario_key' => 'frostbound_path',
                'width' => 30,
                'height' => 20,
                'cell_size' => 32,
                'objects' => $this->buildMapObjects(30, 20, 'frost'),
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
                'name' => 'Сайра Песчаный Шаг',
                'role' => 'Герой',
                'race' => 'Человек',
                'description' => 'Следопыт караванов, ведущий группу через пустыню.',
                'level' => 5,
                'stats' => ['АТК' => 13, 'ЗАЩ' => 11, 'СИЛ' => 10, 'ЛОВ' => 14, 'ВЫН' => 12, 'ИНТ' => 11, 'МДР' => 12, 'ХАР' => 10, 'УДЧ' => 9],
                'inventory_keys' => ['sun_blade', 'sand_cloak', 'mercenary_kit'],
                'campaign_key' => 'dunes',
                'scenario_key' => 'whispering_sands',
            ],
            [
                'name' => 'Арген Веллер',
                'role' => 'NPC',
                'race' => 'Полуэльф',
                'description' => 'Архивариус с доступом к закрытым залам Блэквуда.',
                'level' => 4,
                'stats' => ['АТК' => 8, 'ЗАЩ' => 9, 'СИЛ' => 8, 'ЛОВ' => 10, 'ВЫН' => 10, 'ИНТ' => 15, 'МДР' => 14, 'ХАР' => 12, 'УДЧ' => 11],
                'inventory_keys' => ['arcane_lantern'],
                'campaign_key' => 'depths',
                'scenario_key' => 'vault_of_echoes',
            ],
            [
                'name' => 'Кхазар Безликий',
                'role' => 'Монстр',
                'race' => 'Теневая сущность',
                'description' => 'Сторож разлома, питающийся страхом исследователей.',
                'level' => 7,
                'stats' => ['АТК' => 16, 'ЗАЩ' => 13, 'СИЛ' => 15, 'ЛОВ' => 12, 'ВЫН' => 14, 'ИНТ' => 9, 'МДР' => 8, 'ХАР' => 6, 'УДЧ' => 10],
                'inventory_keys' => [],
                'campaign_key' => 'depths',
                'scenario_key' => 'abyssal_threshold',
            ],
            [
                'name' => 'Торстейн Ледоруб',
                'role' => 'Герой',
                'race' => 'Дварф',
                'description' => 'Воин дозора, командующий северным авангардом.',
                'level' => 6,
                'stats' => ['АТК' => 14, 'ЗАЩ' => 15, 'СИЛ' => 14, 'ЛОВ' => 9, 'ВЫН' => 15, 'ИНТ' => 10, 'МДР' => 11, 'ХАР' => 10, 'УДЧ' => 8],
                'inventory_keys' => ['ice_totem', 'mercenary_kit'],
                'campaign_key' => 'frost',
                'scenario_key' => 'frostbound_path',
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

        // Border walls.
        for ($x = 0; $x < $width; $x++) {
            $objects[] = $this->obj("wall-top-{$x}", $x, 0, 'wall', 'Стена', '#8A8F98');
            $objects[] = $this->obj("wall-bottom-{$x}", $x, $height - 1, 'wall', 'Стена', '#8A8F98');
        }
        for ($y = 1; $y < $height - 1; $y++) {
            $objects[] = $this->obj("wall-left-{$y}", 0, $y, 'wall', 'Стена', '#8A8F98');
            $objects[] = $this->obj("wall-right-{$y}", $width - 1, $y, 'wall', 'Стена', '#8A8F98');
        }

        // Themed center lane.
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

        // One NPC marker for quick demo.
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
