<!DOCTYPE html>
<html lang="ru">
<head>
    <meta charset="UTF-8">
    <title>{{ $scenario->title }}</title>
    <style>
        @page { margin: 12mm; }
        * { box-sizing: border-box; }
        body { font-family: "DejaVu Sans", Arial, sans-serif; color: #121212; font-size: 12px; line-height: 1.45; }
        h1, h2, h3, h4 { margin: 0; line-height: 1.15; }
        h1 { font-size: 26px; letter-spacing: .04em; text-transform: uppercase; }
        h2 { font-size: 17px; margin-bottom: 12px; text-transform: uppercase; border-bottom: 2px solid #ef3340; padding-bottom: 6px; }
        h3 { font-size: 14px; text-transform: uppercase; }
        h4 { font-size: 11px; text-transform: uppercase; color: #555; margin-bottom: 6px; }
        table { width: 100%; border-collapse: collapse; }
        th, td { border: 1px solid #ddd; padding: 7px; vertical-align: top; }
        th { background: #f3f3f3; text-align: left; text-transform: uppercase; font-size: 9px; }
        .title { text-align: center; margin-top: 34px; padding: 28px; border: 2px solid #111; }
        .subtitle { margin-top: 8px; color: #555; }
        .meta { margin-top: 12px; color: #666; font-size: 10px; text-transform: uppercase; }
        .section { margin-top: 28px; page-break-inside: avoid; }
        .muted { color: #666; }
        .accent { color: #ef3340; }
        .pill { display: inline-block; border: 1px solid #bbb; padding: 2px 6px; margin: 0 4px 4px 0; font-size: 9px; text-transform: uppercase; }
        .pill-red { border-color: #ef3340; color: #ef3340; }
        .pill-yellow { border-color: #d4a800; color: #8a6b00; }
        .node { page-break-inside: avoid; margin-top: 14px; padding: 12px; border: 1px solid #bbb; border-left: 4px solid #ef3340; }
        .node-head { display: table; width: 100%; margin-bottom: 8px; }
        .node-title { display: table-cell; width: 72%; }
        .node-type { display: table-cell; width: 28%; text-align: right; color: #ef3340; font-size: 10px; text-transform: uppercase; }
        .content { white-space: pre-line; margin-top: 8px; }
        .config { margin-top: 10px; padding: 8px; background: #f7f7f7; border: 1px solid #ddd; }
        .transition { margin-top: 6px; padding: 7px; border: 1px solid #ddd; }
        .linked { margin-top: 8px; }
        .diagnostics { display: table; width: 100%; border-spacing: 10px 0; margin-left: -10px; }
        .diag-col { display: table-cell; width: 50%; padding: 10px; border: 1px solid #ddd; vertical-align: top; }
        .error { border-color: #ef3340; color: #a40010; }
        .warning { border-color: #d4a800; color: #7b6000; }
        .block { margin-top: 10px; padding: 10px; border: 1px solid #ddd; }
        .block-type { font-weight: bold; margin-bottom: 6px; color: #444; text-transform: uppercase; }
        .map-wrap { margin-top: 14px; border: 1px solid #ccc; padding: 8px; page-break-inside: avoid; }
        .map-title { font-weight: bold; margin-bottom: 8px; }
        .grid { display: grid; gap: 1px; background: #333; }
        .cell { width: 8px; height: 8px; background: #000; }
    </style>
</head>
<body>
    @php
        $graphEnabled = (bool) ($graphExport['enabled'] ?? false);
        $diagnostics = $graphExport['diagnostics'] ?? ['errors' => [], 'warnings' => [], 'startNodes' => [], 'finalNodes' => []];
        $linkedMaterialsByNodeId = $graphExport['linkedMaterialsByNodeId'] ?? [];
        $linkedMaterials = $graphExport['linkedMaterials'] ?? [];
        $nodeById = $scenario->nodes->keyBy('id');
        $transitionsByNode = $scenario->transitions->groupBy('from_node_id');
        $typeLabels = [
            'description' => 'Описание',
            'dialog' => 'Диалог',
            'location' => 'Локация',
            'check' => 'Проверка',
            'loot' => 'Добыча',
            'combat' => 'Бой',
        ];
        $transitionLabels = [
            'linear' => 'Линейный',
            'choice' => 'Выбор',
            'success' => 'Успех',
            'failure' => 'Провал',
        ];
        $targetLabels = [
            'map' => 'Карта',
            'character' => 'Персонаж',
            'item' => 'Предмет',
            'asset' => 'Ассет',
            'location' => 'Локация',
            'faction' => 'Фракция',
            'event' => 'Событие',
        ];
    @endphp

    <div class="title">
        <h1>{{ $scenario->title }}</h1>
        <div class="subtitle">Автор: {{ $scenario->user?->name ?? '—' }}</div>
        <div class="meta">Дата экспорта: {{ $exportedAt->format('d.m.Y H:i') }}</div>
        <div class="meta">Режим: Graph Scenario</div>
    </div>

    @if(!empty($scenario->description))
        <div class="section">
            <h2>Описание</h2>
            <p>{{ $scenario->description }}</p>
        </div>
    @endif

    @if($graphEnabled)
        <div class="section">
            <h2>Обзор графа</h2>
            <p>
                <span class="pill pill-red">{{ $scenario->nodes->count() }} узлов</span>
                <span class="pill pill-red">{{ $scenario->transitions->count() }} переходов</span>
                <span class="pill">Старт: {{ count($diagnostics['startNodes'] ?? []) }}</span>
                <span class="pill">Финал: {{ count($diagnostics['finalNodes'] ?? []) }}</span>
            </p>

            <div class="diagnostics">
                <div class="diag-col error">
                    <h4>Ошибки проверки</h4>
                    @forelse($diagnostics['errors'] as $error)
                        <div>• {{ $error }}</div>
                    @empty
                        <div class="muted">Ошибок нет.</div>
                    @endforelse
                </div>
                <div class="diag-col warning">
                    <h4>Предупреждения</h4>
                    @forelse($diagnostics['warnings'] as $warning)
                        <div>• {{ $warning }}</div>
                    @empty
                        <div class="muted">Предупреждений нет.</div>
                    @endforelse
                </div>
            </div>
        </div>

        <div class="section">
            <h2>Узлы сценария</h2>
            @foreach($scenario->nodes as $node)
                @php
                    $config = $node->config ?? [];
                    $outgoing = $transitionsByNode->get($node->id, collect());
                    $nodeLinks = $linkedMaterialsByNodeId[$node->id] ?? [];
                @endphp
                <div class="node">
                    <div class="node-head">
                        <div class="node-title">
                            <h3>#{{ $node->order_index + 1 }} {{ $node->title ?: 'Без названия' }}</h3>
                        </div>
                        <div class="node-type">{{ $typeLabels[$node->type] ?? $node->type }}</div>
                    </div>

                    @if(!empty($node->content))
                        <div class="content">{{ $node->content }}</div>
                    @endif

                    <div class="config">
                        @switch($node->type)
                            @case('description')
                                <strong>Сцена:</strong> {{ $config['scene'] ?? '—' }}
                                @break
                            @case('dialog')
                                <strong>Говорящий:</strong> {{ $config['speaker'] ?? '—' }}
                                @break
                            @case('location')
                                <strong>Ориентир:</strong> {{ $config['map_hint'] ?? '—' }}
                                @break
                            @case('check')
                                <strong>Навык:</strong> {{ $config['skill'] ?? '—' }} · <strong>DC:</strong> {{ $config['dc'] ?? '—' }}
                                @break
                            @case('loot')
                                <strong>Награда:</strong> {{ $config['item_hint'] ?? '—' }}
                                @break
                            @case('combat')
                                <strong>Столкновение:</strong> {{ $config['encounter'] ?? '—' }}
                                @break
                        @endswitch
                    </div>

                    <div class="linked">
                        <h4>Связанные материалы</h4>
                        @forelse($nodeLinks as $link)
                            <span class="pill">{{ $targetLabels[$link['type']] ?? $link['type'] }}: {{ $link['title'] }}{{ $link['label'] ? ' · ' . $link['label'] : '' }}</span>
                        @empty
                            <span class="muted">Нет связанных материалов.</span>
                        @endforelse
                    </div>

                    <div class="linked">
                        <h4>Исходящие переходы</h4>
                        @forelse($outgoing as $transition)
                            @php
                                $target = $nodeById->get($transition->to_node_id);
                                $condition = $transition->condition ?? [];
                            @endphp
                            <div class="transition">
                                <strong>{{ $transitionLabels[$transition->type] ?? $transition->type }}</strong>
                                @if($transition->label)
                                    · {{ $transition->label }}
                                @endif
                                → {{ $target ? '#' . ($target->order_index + 1) . ' ' . ($target->title ?: 'Без названия') : 'Сломанная ссылка' }}
                                @if(!empty($condition['outcome']))
                                    <div class="muted">Исход: {{ $condition['outcome'] }}{{ isset($condition['dc']) ? ' · DC ' . $condition['dc'] : '' }}</div>
                                @endif
                            </div>
                        @empty
                            <div class="muted">Финальный узел: исходящих переходов нет.</div>
                        @endforelse
                    </div>
                </div>
            @endforeach
        </div>

        <div class="section">
            <h2>Flow Reference</h2>
            <table>
                <thead>
                    <tr>
                        <th>Откуда</th>
                        <th>Тип</th>
                        <th>Метка</th>
                        <th>Куда</th>
                    </tr>
                </thead>
                <tbody>
                    @foreach($scenario->transitions as $transition)
                        @php
                            $from = $nodeById->get($transition->from_node_id);
                            $to = $nodeById->get($transition->to_node_id);
                        @endphp
                        <tr>
                            <td>{{ $from ? '#' . ($from->order_index + 1) . ' ' . ($from->title ?: 'Без названия') : 'Сломанная ссылка' }}</td>
                            <td>{{ $transitionLabels[$transition->type] ?? $transition->type }}</td>
                            <td>{{ $transition->label ?: '—' }}</td>
                            <td>{{ $to ? '#' . ($to->order_index + 1) . ' ' . ($to->title ?: 'Без названия') : 'Сломанная ссылка' }}</td>
                        </tr>
                    @endforeach
                </tbody>
            </table>
        </div>

        @if(count($linkedMaterials) > 0)
            <div class="section">
                <h2>Приложение: материалы</h2>
                @foreach($linkedMaterials as $material)
                    <div class="block">
                        <div class="block-type">{{ $targetLabels[$material['type']] ?? $material['type'] }} · {{ $material['title'] }}</div>
                        @if(!empty($material['description']))
                            <div>{{ $material['description'] }}</div>
                        @endif
                    </div>
                @endforeach
            </div>
        @endif
    @endif

    @if($maps->count() > 0)
        <div class="section">
            <h2>Карты сценария</h2>
            @foreach($maps as $map)
                <div class="map-wrap">
                    <div class="map-title">{{ $map->name }}</div>
                    @php
                        $width = max(1, (int) $map->width);
                        $height = max(1, (int) $map->height);
                        $cells = [];
                        foreach (($map->data['objects'] ?? []) as $obj) {
                            $cells[$obj['x'].'_'.$obj['y']] = $obj;
                        }
                    @endphp
                    <div class="grid" style="grid-template-columns: repeat({{ $width }}, 8px);">
                        @for($y = 0; $y < $height; $y++)
                            @for($x = 0; $x < $width; $x++)
                                @php
                                    $key = $x . '_' . $y;
                                    $color = $cells[$key]['color'] ?? '#000';
                                @endphp
                                <div class="cell" style="background: {{ $color }};"></div>
                            @endfor
                        @endfor
                    </div>
                </div>
            @endforeach
        </div>
    @endif
</body>
</html>
