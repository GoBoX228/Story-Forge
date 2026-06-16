<!DOCTYPE html>
<html lang="ru">
<head>
    <meta charset="UTF-8">
    <title>{{ $scenario->title }}</title>
    <style>
        @page { margin: 8mm; }
        * { box-sizing: border-box; }
        body {
            margin: 0;
            color: #111;
            font-family: "DejaVu Sans", Arial, sans-serif;
            font-size: 8.8px;
            line-height: 1.26;
        }
        h1, h2, h3, h4, p { margin: 0; }
        h1 { font-size: 20px; letter-spacing: .035em; line-height: 1.05; text-transform: uppercase; }
        h2 {
            margin: 0 0 5px;
            padding-bottom: 3px;
            border-bottom: 1.3px solid #e63946;
            font-size: 11.5px;
            letter-spacing: .04em;
            text-transform: uppercase;
        }
        h3 { font-size: 9.6px; line-height: 1.18; text-transform: uppercase; }
        h4 { margin-bottom: 2px; color: #555; font-size: 7.4px; letter-spacing: .04em; text-transform: uppercase; }
        table { width: 100%; border-collapse: collapse; }
        th, td { padding: 3px 4px; border: 1px solid #ddd; vertical-align: top; }
        th { background: #f1f1f1; font-size: 7px; letter-spacing: .04em; text-align: left; text-transform: uppercase; }
        .cover {
            margin-bottom: 8px;
            padding: 11px 13px;
            border: 1.8px solid #111;
        }
        .cover-row { display: table; width: 100%; }
        .cover-main { display: table-cell; width: 68%; vertical-align: top; }
        .cover-meta { display: table-cell; width: 32%; padding-left: 12px; vertical-align: top; text-align: right; }
        .subtitle { margin-top: 5px; color: #555; font-size: 9px; }
        .meta { margin-bottom: 3px; color: #555; font-size: 7.1px; letter-spacing: .04em; text-transform: uppercase; }
        .section { margin-top: 8px; }
        .section-compact { page-break-inside: avoid; }
        .muted { color: #666; }
        .pills { margin-top: 4px; }
        .pill {
            display: inline-block;
            margin: 0 2px 2px 0;
            padding: 1px 4px;
            border: 1px solid #bbb;
            font-size: 6.9px;
            line-height: 1.25;
            text-transform: uppercase;
        }
        .pill-red { border-color: #e63946; color: #b60019; }
        .pill-yellow { border-color: #d4a800; color: #7b6000; }
        .diagnostics { display: table; width: 100%; border-spacing: 5px 0; margin-left: -5px; }
        .diag-col { display: table-cell; width: 50%; padding: 5px; border: 1px solid #ddd; vertical-align: top; }
        .error { border-color: #e63946; color: #9a0011; }
        .warning { border-color: #d4a800; color: #6c5400; }
        .diag-list div { margin-top: 1px; }
        .graph-page {
            margin-top: 0;
            page-break-before: always;
            page-break-after: always;
            page-break-inside: avoid;
        }
        .graph-map {
            height: 252mm;
            border: 1px solid #d6d6d6;
            background: #fafafa;
            overflow: hidden;
            page-break-inside: avoid;
        }
        .graph-map svg { display: block; width: 100%; height: 100%; }
        .graph-empty {
            min-height: 252mm;
            padding: 12px;
            border: 1px dashed #cfcfcf;
            color: #666;
            display: table;
            width: 100%;
            text-align: center;
            text-transform: uppercase;
        }
        .graph-empty span { display: table-cell; vertical-align: middle; }
        .flow td { font-size: 7.6px; }
        .flow-node { font-weight: bold; }
        .nodes { display: block; }
        .node {
            display: block;
            width: 100%;
            margin: 0 0 4px;
            padding: 5px 6px;
            border: 1px solid #cfcfcf;
            border-left: 4px solid #e63946;
            page-break-inside: avoid;
            break-inside: avoid;
        }
        .node-head { display: table; width: 100%; margin-bottom: 3px; }
        .node-title { display: table-cell; width: 74%; vertical-align: top; }
        .node-type {
            display: table-cell;
            width: 26%;
            font-size: 7px;
            font-weight: bold;
            text-align: right;
            text-transform: uppercase;
            vertical-align: top;
        }
        .content {
            margin-top: 3px;
            white-space: pre-line;
        }
        .config {
            margin-top: 4px;
            padding: 3px 4px;
            border: 1px solid #e1e1e1;
            background: #f7f7f7;
        }
        .config-row { display: inline; margin-right: 8px; }
        .linked { margin-top: 4px; }
        .transition {
            margin-top: 2px;
            padding: 2px 3px;
            border: 1px solid #ddd;
        }
        .transition strong { text-transform: uppercase; }
        .inline-list { margin-top: 2px; }
    </style>
</head>
<body>
    @php
        $graphEnabled = (bool) ($graphExport['enabled'] ?? false);
        $diagnostics = $graphExport['diagnostics'] ?? ['errors' => [], 'warnings' => [], 'startNodes' => [], 'finalNodes' => []];
        $linkedMaterialsByNodeId = $graphExport['linkedMaterialsByNodeId'] ?? [];
        $nodeConfigByNodeId = $graphExport['nodeConfigByNodeId'] ?? [];
        $graphMap = $graphExport['graphMap'] ?? ['nodes' => [], 'transitions' => [], 'bounds' => null];
        $graphMapNodes = collect($graphMap['nodes'] ?? [])->keyBy('id');
        $graphMapBounds = $graphMap['bounds'] ?? null;
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
        $typeColors = [
            'description' => '#6b7280',
            'dialog' => '#4361ee',
            'location' => '#2ec4b6',
            'check' => '#ffc300',
            'loot' => '#8338ec',
            'combat' => '#e63946',
        ];
        $transitionLabels = [
            'linear' => 'Линейный',
            'choice' => 'Выбор',
            'success' => 'Успех',
            'failure' => 'Провал',
        ];
        $transitionColors = [
            'linear' => '#666666',
            'choice' => '#d4a800',
            'success' => '#2ec4b6',
            'failure' => '#e63946',
        ];
        $targetLabels = [
            'map' => 'Карта',
            'character' => 'Персонаж',
            'item' => 'Предмет',
            'asset' => 'Ассет',
            'location' => 'Место',
            'faction' => 'Организация',
            'event' => 'Событие',
        ];
        $formatNode = function ($node) {
            if (!$node) {
                return 'Сломанная ссылка';
            }

            return '#' . ($node->order_index + 1) . ' ' . ($node->title ?: 'Без названия');
        };
        $mapPadding = 72;
        $viewBox = null;
        if ($graphMapBounds && $graphMapNodes->isNotEmpty()) {
            $viewBox = [
                'x' => ((float) $graphMapBounds['minX']) - $mapPadding,
                'y' => ((float) $graphMapBounds['minY']) - $mapPadding,
                'width' => max(360, ((float) $graphMapBounds['width']) + ($mapPadding * 2)),
                'height' => max(180, ((float) $graphMapBounds['height']) + ($mapPadding * 2)),
            ];
        }
    @endphp

    <div class="cover">
        <div class="cover-row">
            <div class="cover-main">
                <h1>{{ $scenario->title }}</h1>
                @if(!empty($scenario->description))
                    <div class="subtitle">{{ $scenario->description }}</div>
                @endif
            </div>
            <div class="cover-meta">
                <div class="meta">Автор: {{ $scenario->user?->name ?? '—' }}</div>
                <div class="meta">Экспорт: {{ $exportedAt->format('d.m.Y H:i') }}</div>
                <div class="meta">Режим: Graph Scenario</div>
                <div class="pills">
                    <span class="pill pill-red">{{ $scenario->nodes->count() }} узлов</span>
                    <span class="pill pill-red">{{ $scenario->transitions->count() }} переходов</span>
                </div>
            </div>
        </div>
    </div>

    @if($graphEnabled)
        <div class="section section-compact">
            <h2>Обзор графа</h2>
            <div class="pills">
                <span class="pill">Старт: {{ count($diagnostics['startNodes'] ?? []) }}</span>
                <span class="pill">Финал: {{ count($diagnostics['finalNodes'] ?? []) }}</span>
                @foreach(($diagnostics['startNodes'] ?? []) as $nodeTitle)
                    <span class="pill">Стартовый: {{ $nodeTitle }}</span>
                @endforeach
                @foreach(($diagnostics['finalNodes'] ?? []) as $nodeTitle)
                    <span class="pill">Финальный: {{ $nodeTitle }}</span>
                @endforeach
            </div>
        </div>

        <div class="section section-compact">
            <div class="diagnostics">
                <div class="diag-col error">
                    <h4>Ошибки проверки</h4>
                    <div class="diag-list">
                        @forelse($diagnostics['errors'] as $error)
                            <div>• {{ $error }}</div>
                        @empty
                            <div class="muted">Ошибок нет.</div>
                        @endforelse
                    </div>
                </div>
                <div class="diag-col warning">
                    <h4>Предупреждения</h4>
                    <div class="diag-list">
                        @forelse($diagnostics['warnings'] as $warning)
                            <div>• {{ $warning }}</div>
                        @empty
                            <div class="muted">Предупреждений нет.</div>
                        @endforelse
                    </div>
                </div>
            </div>
        </div>

        <div class="section graph-page">
            <h2>Карта графа</h2>
            @if($viewBox)
                <div class="graph-map">
                    <svg
                        xmlns="http://www.w3.org/2000/svg"
                        viewBox="{{ $viewBox['x'] }} {{ $viewBox['y'] }} {{ $viewBox['width'] }} {{ $viewBox['height'] }}"
                        preserveAspectRatio="xMidYMid meet"
                        role="img"
                        aria-label="Карта графа сценария"
                    >
                        <defs>
                            @foreach($transitionColors as $type => $color)
                                <marker id="arrow-{{ $type }}" markerWidth="10" markerHeight="8" refX="9" refY="4" orient="auto" markerUnits="strokeWidth">
                                    <path d="M 0 0 L 10 4 L 0 8 z" fill="{{ $color }}" />
                                </marker>
                            @endforeach
                        </defs>

                        @foreach(($graphMap['transitions'] ?? []) as $transition)
                            @php
                                $from = $graphMapNodes->get($transition['from']);
                                $to = $graphMapNodes->get($transition['to']);
                            @endphp
                            @if($from && $to)
                                @php
                                    $color = $transitionColors[$transition['type']] ?? $transitionColors['linear'];
                                    $fromX = $from['x'] + ($from['width'] / 2);
                                    $fromY = $from['y'] + ($from['height'] / 2);
                                    $toX = $to['x'] + ($to['width'] / 2);
                                    $toY = $to['y'] + ($to['height'] / 2);
                                    $midX = ($fromX + $toX) / 2;
                                    $midY = ($fromY + $toY) / 2;
                                @endphp
                                <line
                                    x1="{{ $fromX }}"
                                    y1="{{ $fromY }}"
                                    x2="{{ $toX }}"
                                    y2="{{ $toY }}"
                                    stroke="{{ $color }}"
                                    stroke-width="5"
                                    stroke-opacity="0.78"
                                    marker-end="url(#arrow-{{ $transition['type'] }})"
                                />
                                @if(!empty($transition['label']))
                                    <text x="{{ $midX }}" y="{{ $midY - 8 }}" fill="#111" font-size="18" text-anchor="middle" font-weight="700">
                                        {{ \Illuminate\Support\Str::limit($transition['label'], 22) }}
                                    </text>
                                @endif
                            @endif
                        @endforeach

                        @foreach($graphMapNodes as $mapNode)
                            @php
                                $color = $typeColors[$mapNode['type']] ?? $typeColors['description'];
                            @endphp
                            <rect
                                x="{{ $mapNode['x'] }}"
                                y="{{ $mapNode['y'] }}"
                                width="{{ $mapNode['width'] }}"
                                height="{{ $mapNode['height'] }}"
                                rx="0"
                                fill="#ffffff"
                                stroke="{{ $color }}"
                                stroke-width="6"
                            />
                            <rect
                                x="{{ $mapNode['x'] }}"
                                y="{{ $mapNode['y'] }}"
                                width="42"
                                height="{{ $mapNode['height'] }}"
                                fill="{{ $color }}"
                                opacity="0.95"
                            />
                            <text
                                x="{{ $mapNode['x'] + 21 }}"
                                y="{{ $mapNode['y'] + 31 }}"
                                fill="#ffffff"
                                font-size="22"
                                text-anchor="middle"
                                font-weight="800"
                            >#{{ $mapNode['number'] }}</text>
                            <text
                                x="{{ $mapNode['x'] + 56 }}"
                                y="{{ $mapNode['y'] + 34 }}"
                                fill="#111"
                                font-size="20"
                                font-weight="800"
                            >{{ $mapNode['shortTitle'] }}</text>
                            <text
                                x="{{ $mapNode['x'] + 56 }}"
                                y="{{ $mapNode['y'] + 62 }}"
                                fill="{{ $color }}"
                                font-size="14"
                                font-weight="800"
                                text-transform="uppercase"
                            >{{ $typeLabels[$mapNode['type']] ?? $mapNode['type'] }}</text>
                        @endforeach
                    </svg>
                </div>
            @else
                <div class="graph-empty"><span>Карта графа недоступна: у узлов нет сохраненных координат.</span></div>
            @endif
        </div>

        <div class="section section-compact">
            <h2>Схема переходов</h2>
            <table class="flow">
                <thead>
                    <tr>
                        <th>Откуда</th>
                        <th>Тип</th>
                        <th>Метка</th>
                        <th>Куда</th>
                    </tr>
                </thead>
                <tbody>
                    @forelse($scenario->transitions as $transition)
                        @php
                            $from = $nodeById->get($transition->from_node_id);
                            $to = $nodeById->get($transition->to_node_id);
                        @endphp
                        <tr>
                            <td class="flow-node">{{ $formatNode($from) }}</td>
                            <td>{{ $transitionLabels[$transition->type] ?? $transition->type }}</td>
                            <td>{{ $transition->label ?: '—' }}</td>
                            <td class="flow-node">{{ $formatNode($to) }}</td>
                        </tr>
                    @empty
                        <tr>
                            <td colspan="4" class="muted">Переходов пока нет.</td>
                        </tr>
                    @endforelse
                </tbody>
            </table>
        </div>

        <div class="section">
            <h2>Узлы сценария</h2>
            <div class="nodes">
                @foreach($scenario->nodes as $node)
                    @php
                        $configRows = $nodeConfigByNodeId[$node->id] ?? [];
                        $outgoing = $transitionsByNode->get($node->id, collect());
                        $nodeLinks = $linkedMaterialsByNodeId[$node->id] ?? [];
                        $nodeColor = $typeColors[$node->type] ?? $typeColors['description'];
                    @endphp
                    <div class="node" style="border-left-color: {{ $nodeColor }};">
                        <div class="node-head">
                            <div class="node-title">
                                <h3>#{{ $node->order_index + 1 }} {{ $node->title ?: 'Без названия' }}</h3>
                            </div>
                            <div class="node-type" style="color: {{ $nodeColor }};">{{ $typeLabels[$node->type] ?? $node->type }}</div>
                        </div>

                        @if(!empty($node->content))
                            <div class="content">{{ $node->content }}</div>
                        @endif

                        @if(count($configRows) > 0)
                            <div class="config">
                                @foreach($configRows as $row)
                                    <span class="config-row"><strong>{{ $row['label'] }}:</strong> {{ $row['value'] }}</span>
                                @endforeach
                            </div>
                        @endif

                        @if(count($nodeLinks) > 0)
                            <div class="linked">
                                <h4>Материалы</h4>
                                <div class="inline-list">
                                    @foreach($nodeLinks as $link)
                                        <span class="pill">
                                            {{ $targetLabels[$link['type']] ?? $link['type'] }}: {{ $link['title'] }}{{ $link['label'] ? ' · ' . $link['label'] : '' }}
                                        </span>
                                    @endforeach
                                </div>
                            </div>
                        @endif

                        <div class="linked">
                            <h4>Исходящие переходы</h4>
                            @forelse($outgoing as $transition)
                                @php
                                    $target = $nodeById->get($transition->to_node_id);
                                    $condition = $transition->condition ?? [];
                                    $transitionColor = $transitionColors[$transition->type] ?? $transitionColors['linear'];
                                @endphp
                                <div class="transition" style="border-left: 3px solid {{ $transitionColor }};">
                                    <strong>{{ $transitionLabels[$transition->type] ?? $transition->type }}</strong>
                                    @if($transition->label)
                                        · {{ $transition->label }}
                                    @endif
                                    → {{ $formatNode($target) }}
                                    @if(!empty($condition['outcome']))
                                        <span class="muted"> · исход: {{ $condition['outcome'] }}{{ isset($condition['dc']) ? ' · DC ' . $condition['dc'] : '' }}</span>
                                    @endif
                                </div>
                            @empty
                                <div class="muted">Финальный узел: исходящих переходов нет.</div>
                            @endforelse
                        </div>
                    </div>
                @endforeach
            </div>
        </div>
    @endif
</body>
</html>
