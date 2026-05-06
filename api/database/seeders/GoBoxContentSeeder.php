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
                'title' => 'Р—Р°РєР°С‚ РїС‹Р»Р°СЋС‰РёС… РїРµСЃРєРѕРІ',
                'description' => 'РљР°СЂР°РІР°РЅС‹ РёСЃС‡РµР·Р°СЋС‚, Рё РґСЂРµРІРЅРёРµ СЂСѓРёРЅС‹ РїСЂРѕР±СѓР¶РґР°СЋС‚СЃСЏ РїРѕРґ Р±Р°СЂС…Р°РЅР°РјРё.',
                'tags' => ['desert', 'mystery', 'survival'],
                'resources' => ['РљР°СЂС‚Р° РєР°СЂР°РІР°РЅРЅС‹С… РїСѓС‚РµР№', 'РЎРїРёСЃРѕРє С„СЂР°РєС†РёР№ РѕР°Р·РёСЃР°'],
                'progress' => 45,
                'last_played' => '2026-02-10',
            ],
            'depths' => [
                'title' => 'РўРµРЅРё Р±РµР·РґРЅС‹',
                'description' => 'Р­РєСЃРїРµРґРёС†РёСЏ РІ РїРѕРґР·РµРјРЅС‹Рµ Р·Р°Р»С‹, РіРґРµ РјР°РіРёСЏ Рё РјРµС…Р°РЅРёР·РјС‹ РІС‹С€Р»Рё РёР·-РїРѕРґ РєРѕРЅС‚СЂРѕР»СЏ.',
                'tags' => ['dungeon', 'horror', 'arcana'],
                'resources' => ['РЎС…РµРјР° РЅРёР¶РЅРµРіРѕ СѓСЂРѕРІРЅСЏ', 'Р”РЅРµРІРЅРёРє Р°СЂС…РёРјР°РіР°'],
                'progress' => 30,
                'last_played' => '2026-02-08',
            ],
            'frost' => [
                'title' => 'РҐСЂРѕРЅРёРєРё Р»РµРґСЏРЅРѕРіРѕ РїРёРєР°',
                'description' => 'РЎРµРІРµСЂРЅС‹Рµ РїР»РµРјРµРЅР° РїСЂРѕСЃСЏС‚ РїРѕРјРѕС‰Рё РїСЂРѕС‚РёРІ РєСѓР»СЊС‚Р°, РїСЂРѕР±СѓР¶РґР°СЋС‰РµРіРѕ С€С‚РѕСЂРјС‹.',
                'tags' => ['winter', 'tribes', 'epic'],
                'resources' => ['РњР°СЂС€СЂСѓС‚ РїРµСЂРµРІР°Р»Р°', 'РўРѕС‚РµРјРЅС‹Рµ Р»РµРіРµРЅРґС‹'],
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
                'name' => 'РљР»РёРЅРѕРє СЂР°СЃСЃРІРµС‚Р°',
                'type' => 'РћСЂСѓР¶РёРµ',
                'rarity' => 'Р­РїРёС‡РµСЃРєРёР№',
                'description' => 'РњРµС‡, СѓСЃРёР»РёРІР°СЋС‰РёР№СЃСЏ РЅР° РѕС‚РєСЂС‹С‚РѕРј СЃРѕР»РЅС†Рµ.',
                'modifiers' => [
                    ['stat' => 'РђРўРљ', 'value' => 4],
                    ['stat' => 'РҐРђР ', 'value' => 1],
                ],
                'weight' => 2.8,
                'value' => 950,
            ],
            'sand_cloak' => [
                'name' => 'РџР»Р°С‰ РґСЋРЅ',
                'type' => 'Р‘СЂРѕРЅСЏ',
                'rarity' => 'Р РµРґРєРёР№',
                'description' => 'РџРѕРіР»РѕС‰Р°РµС‚ С‡Р°СЃС‚СЊ СѓСЂРѕРЅР° РѕС‚ РґР°Р»СЊРЅРёС… Р°С‚Р°Рє.',
                'modifiers' => [
                    ['stat' => 'Р—РђР©', 'value' => 3],
                    ['stat' => 'Р›РћР’', 'value' => 1],
                ],
                'weight' => 3.4,
                'value' => 620,
            ],
            'arcane_lantern' => [
                'name' => 'РђСЂРєР°РЅРЅС‹Р№ С„РѕРЅР°СЂСЊ',
                'type' => 'РРЅСЃС‚СЂСѓРјРµРЅС‚',
                'rarity' => 'РќРµРѕР±С‹С‡РЅС‹Р№',
                'description' => 'РџРѕРґСЃРІРµС‡РёРІР°РµС‚ СЃРєСЂС‹С‚С‹Рµ СЂСѓРЅС‹ Рё Р»РѕРІСѓС€РєРё.',
                'modifiers' => [
                    ['stat' => 'РРќРў', 'value' => 2],
                ],
                'weight' => 1.2,
                'value' => 280,
            ],
            'ice_totem' => [
                'name' => 'РўРѕС‚РµРј СЃС‚СѓР¶Рё',
                'type' => 'РђСЂС‚РµС„Р°РєС‚',
                'rarity' => 'Р›РµРіРµРЅРґР°СЂРЅС‹Р№',
                'description' => 'РЎС‚Р°Р±РёР»РёР·РёСЂСѓРµС‚ С‚РµРјРїРµСЂР°С‚СѓСЂСѓ Рё СЂР°СЃСЃРµРёРІР°РµС‚ РјРµС‚РµР»Рё.',
                'modifiers' => [
                    ['stat' => 'Р’Р«Рќ', 'value' => 3],
                    ['stat' => 'РњР”Р ', 'value' => 2],
                ],
                'weight' => 4.1,
                'value' => 1700,
            ],
            'mercenary_kit' => [
                'name' => 'РќР°Р±РѕСЂ РЅР°РµРјРЅРёРєР°',
                'type' => 'РЎРЅР°СЂСЏР¶РµРЅРёРµ',
                'rarity' => 'РћР±С‹С‡РЅС‹Р№',
                'description' => 'Р’РµСЂРµРІРєР°, РєСЂСЋРєРё, РјР°СЃР»Рѕ Рё Р±Р°Р·РѕРІС‹Рµ РёРЅСЃС‚СЂСѓРјРµРЅС‚С‹.',
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
                'title' => 'РЁРµРїРѕС‚ РґСЂРµРІРЅРёС… РїРµСЃРєРѕРІ',
                'description' => 'РљРѕРјР°РЅРґР° РіРµСЂРѕРµРІ СЃРѕРїСЂРѕРІРѕР¶РґР°РµС‚ РєР°СЂР°РІР°РЅ Рё РЅР°С…РѕРґРёС‚ РІС…РѕРґ РІ Р·Р°С‚РµСЂСЏРЅРЅС‹Р№ С…СЂР°Рј.',
                'campaign_key' => 'dunes',
                'graph' => $this->demoScenarioGraph('whispering_sands'),
            ],
            'vault_of_echoes' => [
                'title' => 'РќРѕС‡СЊ РІ РїРѕРјРµСЃС‚СЊРµ Р‘Р»СЌРєРІСѓРґ',
                'description' => 'Р Р°СЃСЃР»РµРґРѕРІР°РЅРёРµ СѓР±РёР№СЃС‚РІР°, СЃРІСЏР·Р°РЅРЅРѕРіРѕ СЃ Р°СЂС‚РµС„Р°РєС‚РѕРј РіРѕР»РѕСЃР°.',
                'campaign_key' => 'depths',
                'graph' => $this->demoScenarioGraph('vault_of_echoes'),
            ],
            'abyssal_threshold' => [
                'title' => 'РџРѕСЂРѕРі Р±РµР·РґРЅС‹',
                'description' => 'Р­РєСЃРїРµРґРёС†РёСЏ РІ С€Р°С…С‚С‹, РіРґРµ СЂР°Р·Р»РѕРј РёСЃРєР°Р¶Р°РµС‚ СЂРµР°Р»СЊРЅРѕСЃС‚СЊ.',
                'campaign_key' => 'depths',
                'graph' => $this->demoScenarioGraph('abyssal_threshold'),
            ],
            'frostbound_path' => [
                'title' => 'РљР»СЏС‚РІР° СЃРµРІРµСЂРЅРѕРіРѕ РґРѕР·РѕСЂР°',
                'description' => 'РџР»РµРјРµРЅР° РѕР±СЉРµРґРёРЅСЏСЋС‚СЃСЏ, С‡С‚РѕР±С‹ РѕСЃС‚Р°РЅРѕРІРёС‚СЊ РєСѓР»СЊС‚ Р»РµРґСЏРЅРѕРіРѕ С€С‚РѕСЂРјР°.',
                'campaign_key' => 'frost',
                'graph' => $this->demoScenarioGraph('frostbound_path'),
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

            $this->seedScenarioGraph($scenario, $payload['graph']);

            $scenarios[$key] = $scenario->fresh();
        }

        return $scenarios;
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
                'order_index' => $transitionPayload['order_index'] ?? $transitionIndex,
            ]);
        }
    }

    /**
     * @return array<string, array<int, array<string, mixed>>>
     */
    private function demoScenarioGraph(string $scenarioKey): array
    {
        $graphs = [
            'whispering_sands' => [
                'nodes' => [
                    [
                        'key' => 'caravan_oasis',
                        'type' => 'description',
                        'title' => 'Caravan at Kharum',
                        'content' => 'The party reaches the oasis and learns that raiders are tracking the caravan.',
                        'position' => ['x' => 120, 'y' => 120],
                        'config' => ['scene' => 'intro'],
                        'order_index' => 0,
                    ],
                    [
                        'key' => 'elder_bargain',
                        'type' => 'dialog',
                        'title' => 'Elder bargain',
                        'content' => 'The elder asks the heroes to guard the cargo and offers a temple map.',
                        'position' => ['x' => 360, 'y' => 80],
                        'config' => ['speaker' => 'oasis_elder'],
                        'order_index' => 1,
                    ],
                    [
                        'key' => 'spot_tracks',
                        'type' => 'check',
                        'title' => 'Spot the tracks',
                        'content' => 'A perception check reveals raider scouts near the dunes.',
                        'position' => ['x' => 360, 'y' => 240],
                        'config' => ['skill' => 'perception', 'dc' => 12],
                        'order_index' => 2,
                    ],
                    [
                        'key' => 'temple_gate',
                        'type' => 'location',
                        'title' => 'Buried temple gate',
                        'content' => 'A stairway opens under the sand and descends into Astar temple.',
                        'position' => ['x' => 620, 'y' => 120],
                        'config' => ['map_hint' => 'temple_entrance'],
                        'order_index' => 3,
                    ],
                    [
                        'key' => 'sand_guardians',
                        'type' => 'combat',
                        'title' => 'Sand guardians',
                        'content' => 'Animated guardians rise near the entrance arch.',
                        'position' => ['x' => 860, 'y' => 120],
                        'config' => ['encounter' => 'medium'],
                        'order_index' => 4,
                    ],
                ],
                'transitions' => [
                    ['from' => 'caravan_oasis', 'to' => 'elder_bargain', 'type' => 'linear', 'label' => 'Meet the elder', 'condition' => [], 'order_index' => 0],
                    ['from' => 'elder_bargain', 'to' => 'spot_tracks', 'type' => 'linear', 'label' => 'Inspect the route', 'condition' => [], 'order_index' => 0],
                    ['from' => 'spot_tracks', 'to' => 'temple_gate', 'type' => 'success', 'label' => 'Tracks found', 'condition' => ['dc' => 12, 'outcome' => 'success'], 'order_index' => 0],
                    ['from' => 'spot_tracks', 'to' => 'sand_guardians', 'type' => 'failure', 'label' => 'Ambushed', 'condition' => ['dc' => 12, 'outcome' => 'failure'], 'order_index' => 1],
                    ['from' => 'temple_gate', 'to' => 'sand_guardians', 'type' => 'linear', 'label' => 'Enter the ruins', 'condition' => [], 'order_index' => 0],
                ],
            ],
            'vault_of_echoes' => [
                'nodes' => [
                    [
                        'key' => 'blackwood_reception',
                        'type' => 'description',
                        'title' => 'Blackwood reception',
                        'content' => 'A noble reception is interrupted by a sudden blackout.',
                        'position' => ['x' => 120, 'y' => 120],
                        'config' => ['scene' => 'mansion'],
                        'order_index' => 0,
                    ],
                    [
                        'key' => 'host_accusation',
                        'type' => 'dialog',
                        'title' => 'Host accusation',
                        'content' => 'The host accuses a rival house of sabotaging the artifact.',
                        'position' => ['x' => 360, 'y' => 80],
                        'config' => ['speaker' => 'lady_blackwood'],
                        'order_index' => 1,
                    ],
                    [
                        'key' => 'secret_archive',
                        'type' => 'location',
                        'title' => 'Secret archive',
                        'content' => 'A hidden stair leads to an archive of unstable crystals.',
                        'position' => ['x' => 360, 'y' => 240],
                        'config' => ['map_hint' => 'archive'],
                        'order_index' => 2,
                    ],
                    [
                        'key' => 'decode_notes',
                        'type' => 'check',
                        'title' => 'Decode crystal notes',
                        'content' => 'An intelligence check decodes the pattern in the crystal notes.',
                        'position' => ['x' => 620, 'y' => 160],
                        'config' => ['skill' => 'intelligence', 'dc' => 14],
                        'order_index' => 3,
                    ],
                    [
                        'key' => 'archive_guardian',
                        'type' => 'combat',
                        'title' => 'Archive guardian',
                        'content' => 'The library guardian animates and attacks the group.',
                        'position' => ['x' => 860, 'y' => 160],
                        'config' => ['encounter' => 'guardian'],
                        'order_index' => 4,
                    ],
                ],
                'transitions' => [
                    ['from' => 'blackwood_reception', 'to' => 'host_accusation', 'type' => 'linear', 'label' => 'Question the host', 'condition' => [], 'order_index' => 0],
                    ['from' => 'host_accusation', 'to' => 'secret_archive', 'type' => 'linear', 'label' => 'Follow the clue', 'condition' => [], 'order_index' => 0],
                    ['from' => 'secret_archive', 'to' => 'decode_notes', 'type' => 'linear', 'label' => 'Study the crystals', 'condition' => [], 'order_index' => 0],
                    ['from' => 'decode_notes', 'to' => 'archive_guardian', 'type' => 'failure', 'label' => 'Trigger the defense', 'condition' => ['dc' => 14, 'outcome' => 'failure'], 'order_index' => 0],
                ],
            ],
            'abyssal_threshold' => [
                'nodes' => [
                    [
                        'key' => 'broken_lift',
                        'type' => 'location',
                        'title' => 'Broken lift',
                        'content' => 'The party repairs a lift hanging above the mine shaft.',
                        'position' => ['x' => 120, 'y' => 140],
                        'config' => ['map_hint' => 'shaft_lift'],
                        'order_index' => 0,
                    ],
                    [
                        'key' => 'repair_check',
                        'type' => 'check',
                        'title' => 'Restart the mechanism',
                        'content' => 'A strength or tools check restarts the unstable mechanism.',
                        'position' => ['x' => 360, 'y' => 140],
                        'config' => ['skill' => 'tools', 'dc' => 11],
                        'order_index' => 1,
                    ],
                    [
                        'key' => 'rift_heart',
                        'type' => 'description',
                        'title' => 'Heart of the rift',
                        'content' => 'A dark crystal pulses at the center of the mine.',
                        'position' => ['x' => 620, 'y' => 80],
                        'config' => ['scene' => 'rift'],
                        'order_index' => 2,
                    ],
                    [
                        'key' => 'shadow_reflections',
                        'type' => 'combat',
                        'title' => 'Shadow reflections',
                        'content' => 'Distorted reflections of the heroes emerge from the rift.',
                        'position' => ['x' => 620, 'y' => 240],
                        'config' => ['encounter' => 'hard'],
                        'order_index' => 3,
                    ],
                    [
                        'key' => 'stabilized_shard',
                        'type' => 'loot',
                        'title' => 'Stabilized shard',
                        'content' => 'A stabilized crystal shard can be recovered for the mages guild.',
                        'position' => ['x' => 860, 'y' => 160],
                        'config' => ['item_hint' => 'rift_shard'],
                        'order_index' => 4,
                    ],
                ],
                'transitions' => [
                    ['from' => 'broken_lift', 'to' => 'repair_check', 'type' => 'linear', 'label' => 'Inspect the lift', 'condition' => [], 'order_index' => 0],
                    ['from' => 'repair_check', 'to' => 'rift_heart', 'type' => 'success', 'label' => 'Lift restored', 'condition' => ['dc' => 11, 'outcome' => 'success'], 'order_index' => 0],
                    ['from' => 'repair_check', 'to' => 'shadow_reflections', 'type' => 'failure', 'label' => 'Mechanism collapses', 'condition' => ['dc' => 11, 'outcome' => 'failure'], 'order_index' => 1],
                    ['from' => 'rift_heart', 'to' => 'shadow_reflections', 'type' => 'linear', 'label' => 'Disturb the crystal', 'condition' => [], 'order_index' => 0],
                    ['from' => 'shadow_reflections', 'to' => 'stabilized_shard', 'type' => 'linear', 'label' => 'Claim the shard', 'condition' => [], 'order_index' => 0],
                ],
            ],
            'frostbound_path' => [
                'nodes' => [
                    [
                        'key' => 'clan_moot',
                        'type' => 'dialog',
                        'title' => 'Clan moot',
                        'content' => 'The northern clans demand proof of loyalty before joining forces.',
                        'position' => ['x' => 120, 'y' => 120],
                        'config' => ['speaker' => 'clan_chief'],
                        'order_index' => 0,
                    ],
                    [
                        'key' => 'charisma_trial',
                        'type' => 'check',
                        'title' => 'Win the clans',
                        'content' => 'A charisma check settles negotiations between rival clans.',
                        'position' => ['x' => 360, 'y' => 120],
                        'config' => ['skill' => 'charisma', 'dc' => 13],
                        'order_index' => 1,
                    ],
                    [
                        'key' => 'white_storm_temple',
                        'type' => 'location',
                        'title' => 'White storm temple',
                        'content' => 'The ice temple is surrounded by runes that strengthen the blizzard.',
                        'position' => ['x' => 620, 'y' => 80],
                        'config' => ['map_hint' => 'storm_temple'],
                        'order_index' => 2,
                    ],
                    [
                        'key' => 'cold_shaman',
                        'type' => 'combat',
                        'title' => 'Cold shaman',
                        'content' => 'Cultists and a cold shaman defend the altar.',
                        'position' => ['x' => 620, 'y' => 240],
                        'config' => ['encounter' => 'cultists'],
                        'order_index' => 3,
                    ],
                    [
                        'key' => 'ice_totem',
                        'type' => 'loot',
                        'title' => 'Totem of frost',
                        'content' => 'The recovered totem can calm the storm for a short time.',
                        'position' => ['x' => 860, 'y' => 160],
                        'config' => ['item_hint' => 'ice_totem'],
                        'order_index' => 4,
                    ],
                ],
                'transitions' => [
                    ['from' => 'clan_moot', 'to' => 'charisma_trial', 'type' => 'linear', 'label' => 'Speak for the party', 'condition' => [], 'order_index' => 0],
                    ['from' => 'charisma_trial', 'to' => 'white_storm_temple', 'type' => 'success', 'label' => 'Clans agree', 'condition' => ['dc' => 13, 'outcome' => 'success'], 'order_index' => 0],
                    ['from' => 'charisma_trial', 'to' => 'cold_shaman', 'type' => 'failure', 'label' => 'Rivals withdraw', 'condition' => ['dc' => 13, 'outcome' => 'failure'], 'order_index' => 1],
                    ['from' => 'white_storm_temple', 'to' => 'cold_shaman', 'type' => 'linear', 'label' => 'Enter the temple', 'condition' => [], 'order_index' => 0],
                    ['from' => 'cold_shaman', 'to' => 'ice_totem', 'type' => 'linear', 'label' => 'Secure the altar', 'condition' => [], 'order_index' => 0],
                ],
            ],
        ];

        return $graphs[$scenarioKey] ?? ['nodes' => [], 'transitions' => []];
    }

    /**
     * @param array<string, Campaign> $campaigns
     * @param array<string, Scenario> $scenarios
     */
    private function seedMaps(User $user, array $campaigns, array $scenarios): void
    {
        $dataset = [
            [
                'name' => 'РћР°Р·РёСЃ РљС…Р°СЂСѓРј',
                'campaign_key' => 'dunes',
                'scenario_key' => 'whispering_sands',
                'width' => 28,
                'height' => 20,
                'cell_size' => 32,
                'objects' => $this->buildMapObjects(28, 20, 'sand'),
            ],
            [
                'name' => 'РџРѕРґР·РµРјРЅС‹Р№ Р°СЂС…РёРІ',
                'campaign_key' => 'depths',
                'scenario_key' => 'vault_of_echoes',
                'width' => 24,
                'height' => 18,
                'cell_size' => 32,
                'objects' => $this->buildMapObjects(24, 18, 'dungeon'),
            ],
            [
                'name' => 'Р Р°Р·Р»РѕРј С€Р°С…С‚С‹',
                'campaign_key' => 'depths',
                'scenario_key' => 'abyssal_threshold',
                'width' => 26,
                'height' => 22,
                'cell_size' => 32,
                'objects' => $this->buildMapObjects(26, 22, 'abyss'),
            ],
            [
                'name' => 'РҐСЂР°Рј Р±РµР»РѕР№ Р±СѓСЂРё',
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
                'name' => 'РЎР°Р№СЂР° РџРµСЃС‡Р°РЅС‹Р№ РЁР°Рі',
                'role' => 'Р“РµСЂРѕР№',
                'race' => 'Р§РµР»РѕРІРµРє',
                'description' => 'РЎР»РµРґРѕРїС‹С‚ РєР°СЂР°РІР°РЅРѕРІ, РІРµРґСѓС‰РёР№ РіСЂСѓРїРїСѓ С‡РµСЂРµР· РїСѓСЃС‚С‹РЅСЋ.',
                'level' => 5,
                'stats' => ['РђРўРљ' => 13, 'Р—РђР©' => 11, 'РЎРР›' => 10, 'Р›РћР’' => 14, 'Р’Р«Рќ' => 12, 'РРќРў' => 11, 'РњР”Р ' => 12, 'РҐРђР ' => 10, 'РЈР”Р§' => 9],
                'inventory_keys' => ['sun_blade', 'sand_cloak', 'mercenary_kit'],
                'campaign_key' => 'dunes',
                'scenario_key' => 'whispering_sands',
            ],
            [
                'name' => 'РђСЂРіРµРЅ Р’РµР»Р»РµСЂ',
                'role' => 'NPC',
                'race' => 'РџРѕР»СѓСЌР»СЊС„',
                'description' => 'РђСЂС…РёРІР°СЂРёСѓСЃ СЃ РґРѕСЃС‚СѓРїРѕРј Рє Р·Р°РєСЂС‹С‚С‹Рј Р·Р°Р»Р°Рј Р‘Р»СЌРєРІСѓРґР°.',
                'level' => 4,
                'stats' => ['РђРўРљ' => 8, 'Р—РђР©' => 9, 'РЎРР›' => 8, 'Р›РћР’' => 10, 'Р’Р«Рќ' => 10, 'РРќРў' => 15, 'РњР”Р ' => 14, 'РҐРђР ' => 12, 'РЈР”Р§' => 11],
                'inventory_keys' => ['arcane_lantern'],
                'campaign_key' => 'depths',
                'scenario_key' => 'vault_of_echoes',
            ],
            [
                'name' => 'РљС…Р°Р·Р°СЂ Р‘РµР·Р»РёРєРёР№',
                'role' => 'РњРѕРЅСЃС‚СЂ',
                'race' => 'РўРµРЅРµРІР°СЏ СЃСѓС‰РЅРѕСЃС‚СЊ',
                'description' => 'РЎС‚РѕСЂРѕР¶ СЂР°Р·Р»РѕРјР°, РїРёС‚Р°СЋС‰РёР№СЃСЏ СЃС‚СЂР°С…РѕРј РёСЃСЃР»РµРґРѕРІР°С‚РµР»РµР№.',
                'level' => 7,
                'stats' => ['РђРўРљ' => 16, 'Р—РђР©' => 13, 'РЎРР›' => 15, 'Р›РћР’' => 12, 'Р’Р«Рќ' => 14, 'РРќРў' => 9, 'РњР”Р ' => 8, 'РҐРђР ' => 6, 'РЈР”Р§' => 10],
                'inventory_keys' => [],
                'campaign_key' => 'depths',
                'scenario_key' => 'abyssal_threshold',
            ],
            [
                'name' => 'РўРѕСЂСЃС‚РµР№РЅ Р›РµРґРѕСЂСѓР±',
                'role' => 'Р“РµСЂРѕР№',
                'race' => 'Р”РІР°СЂС„',
                'description' => 'Р’РѕРёРЅ РґРѕР·РѕСЂР°, РєРѕРјР°РЅРґСѓСЋС‰РёР№ СЃРµРІРµСЂРЅС‹Рј Р°РІР°РЅРіР°СЂРґРѕРј.',
                'level' => 6,
                'stats' => ['РђРўРљ' => 14, 'Р—РђР©' => 15, 'РЎРР›' => 14, 'Р›РћР’' => 9, 'Р’Р«Рќ' => 15, 'РРќРў' => 10, 'РњР”Р ' => 11, 'РҐРђР ' => 10, 'РЈР”Р§' => 8],
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
            $objects[] = $this->obj("wall-top-{$x}", $x, 0, 'wall', 'РЎС‚РµРЅР°', '#8A8F98');
            $objects[] = $this->obj("wall-bottom-{$x}", $x, $height - 1, 'wall', 'РЎС‚РµРЅР°', '#8A8F98');
        }
        for ($y = 1; $y < $height - 1; $y++) {
            $objects[] = $this->obj("wall-left-{$y}", 0, $y, 'wall', 'РЎС‚РµРЅР°', '#8A8F98');
            $objects[] = $this->obj("wall-right-{$y}", $width - 1, $y, 'wall', 'РЎС‚РµРЅР°', '#8A8F98');
        }

        // Themed center lane.
        for ($x = 2; $x < $width - 2; $x += 2) {
            $y = (int) floor($height / 2);
            if ($theme === 'sand') {
                $objects[] = $this->obj("sand-{$x}", $x, $y, 'floor', 'РџРµСЃРѕРє', '#9C7A52');
            } elseif ($theme === 'dungeon') {
                $objects[] = $this->obj("dungeon-{$x}", $x, $y, 'loot', 'Р СѓРЅС‹', '#8338EC');
            } elseif ($theme === 'abyss') {
                $objects[] = $this->obj("abyss-{$x}", $x, $y, 'lava', 'Р Р°Р·Р»РѕРј', '#E63946');
            } else {
                $objects[] = $this->obj("frost-{$x}", $x, $y, 'water', 'Р›РµРґ', '#7CB7E5');
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
