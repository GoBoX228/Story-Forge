<!DOCTYPE html>
<html lang="ru">
<head>
    <meta charset="UTF-8">
    <title>{{ $scenario->title }}</title>
    <style>
        @page { margin: 12mm; }
        body { font-family: "DejaVu Sans", Arial, sans-serif; color: #111; font-size: 12px; }
        h1, h2, h3 { margin: 0; }
        .title { text-align: center; margin-top: 40px; }
        .subtitle { margin-top: 8px; color: #555; }
        .section { margin-top: 28px; }
        .chapter { margin-top: 20px; }
        .block { margin-top: 10px; padding: 10px; border: 1px solid #ddd; }
        .block-type { font-weight: bold; margin-bottom: 6px; color: #444; }
        .meta { margin-top: 16px; color: #666; font-size: 10px; }
        .map-wrap { margin-top: 14px; border: 1px solid #ccc; padding: 8px; }
        .map-title { font-weight: bold; margin-bottom: 8px; }
        .grid { display: grid; gap: 1px; background: #333; }
        .cell { width: 8px; height: 8px; background: #000; }
    </style>
</head>
<body>
    <div class="title">
        <h1>{{ $scenario->title }}</h1>
        <div class="subtitle">Автор: {{ $scenario->user?->name ?? '—' }}</div>
        <div class="meta">Дата экспорта: {{ $exportedAt->format('d.m.Y H:i') }}</div>
    </div>

    @if(!empty($scenario->description))
        <div class="section">
            <h2>Описание</h2>
            <p>{{ $scenario->description }}</p>
        </div>
    @endif

    <div class="section">
        <h2>Главы и блоки</h2>
        @forelse($scenario->chapters as $chapter)
            <div class="chapter">
                <h3>{{ $chapter->title }}</h3>
                @forelse($chapter->blocks as $block)
                    <div class="block">
                        <div class="block-type">{{ $block->type }}</div>
                        <div>{!! nl2br(e($block->content)) !!}</div>
                    </div>
                @empty
                    <div class="block">Нет блоков.</div>
                @endforelse
            </div>
        @empty
            <p>Главы не найдены.</p>
        @endforelse
    </div>

    @if($maps->count() > 0)
        <div class="section">
            <h2>Карты</h2>
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
