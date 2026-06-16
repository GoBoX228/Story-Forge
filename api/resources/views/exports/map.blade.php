@php
    $pageSize = strtoupper($mapExport['pageSize'] ?? 'A4');
    $orientation = $mapExport['orientation'] ?? 'landscape';
    $pageWidthMm = $mapExport['pageWidthMm'] ?? 297;
    $pageHeightMm = $mapExport['pageHeightMm'] ?? 210;
    $grid = $mapExport['grid'] ?? [];
    $pixelWidth = max(1, (int) ($grid['pixelWidth'] ?? 1));
    $pixelHeight = max(1, (int) ($grid['pixelHeight'] ?? 1));
    $cellSize = max(1, (int) ($grid['cellSize'] ?? 32));
    $background = $mapExport['background'] ?? ['visible' => true, 'url' => null];
    $layers = $mapExport['layers'] ?? [];
@endphp
<!doctype html>
<html lang="ru">
<head>
    <meta charset="utf-8">
    <title>{{ $map->name }} · PDF</title>
    <style>
        @page {
            size: {{ $pageSize }} {{ $orientation }};
            margin: 0;
        }

        * {
            box-sizing: border-box;
        }

        body {
            margin: 0;
            background: #f4f5f7;
            color: #111827;
            font-family: DejaVu Sans, Arial, sans-serif;
        }

        .sheet {
            width: {{ $pageWidthMm }}mm;
            height: {{ $pageHeightMm }}mm;
            padding: 7mm;
            display: flex;
            flex-direction: column;
            gap: 4mm;
            page-break-after: always;
        }

        .header {
            display: flex;
            align-items: flex-end;
            justify-content: space-between;
            gap: 8mm;
            border-bottom: 0.4mm solid #111827;
            padding-bottom: 2mm;
            flex: 0 0 auto;
        }

        .title {
            font-size: 13pt;
            line-height: 1.05;
            font-weight: 900;
            letter-spacing: 0.05em;
            text-transform: uppercase;
        }

        .meta {
            font-size: 6.5pt;
            line-height: 1.45;
            color: #4b5563;
            font-weight: 700;
            letter-spacing: 0.08em;
            text-align: right;
            text-transform: uppercase;
            white-space: nowrap;
        }

        .map-frame {
            flex: 1 1 auto;
            min-height: 0;
            border: 0.35mm solid #111827;
            background: #050505;
            display: flex;
            align-items: center;
            justify-content: center;
            overflow: hidden;
        }

        svg {
            display: block;
            width: 100%;
            height: 100%;
            shape-rendering: crispEdges;
        }

        .grid-line {
            stroke: rgba(255, 255, 255, 0.16);
            stroke-width: 1;
            vector-effect: non-scaling-stroke;
        }

        .object-border {
            fill: none;
            stroke: rgba(255, 255, 255, 0.55);
            stroke-width: 1.2;
            vector-effect: non-scaling-stroke;
        }

        .map-border {
            fill: none;
            stroke: rgba(255, 255, 255, 0.75);
            stroke-width: 1.4;
            vector-effect: non-scaling-stroke;
        }
    </style>
</head>
<body>
<section class="sheet" data-map-id="{{ $map->id }}" data-page-size="{{ $mapExport['pageSize'] }}" data-orientation="{{ $orientation }}">
    <header class="header">
        <div class="title">{{ $map->name }}</div>
        <div class="meta">
            {{ $grid['width'] ?? $map->width }} × {{ $grid['height'] ?? $map->height }} клеток · {{ $pageSize }} · {{ $orientation === 'landscape' ? 'Альбомная' : 'Книжная' }}<br>
            Экспортировано {{ $exportedAt->format('d.m.Y H:i') }}
        </div>
    </header>

    <main class="map-frame">
        <svg viewBox="0 0 {{ $pixelWidth }} {{ $pixelHeight }}" preserveAspectRatio="xMidYMid meet" role="img" aria-label="Карта {{ $map->name }}">
            <rect x="0" y="0" width="{{ $pixelWidth }}" height="{{ $pixelHeight }}" fill="#050505" />

            @if(($background['visible'] ?? false) && !empty($background['url']))
                <image href="{{ $background['url'] }}" x="0" y="0" width="{{ $pixelWidth }}" height="{{ $pixelHeight }}" preserveAspectRatio="none" data-map-background="image" />
            @endif

            @foreach($layers as $layer)
                @if(($layer['type'] ?? '') === 'tiles')
                    <g data-layer-type="tiles" opacity="{{ $layer['opacity'] ?? 1 }}">
                        @foreach(($layer['objects'] ?? []) as $object)
                            @php
                                $centerX = (float) $object['x'] + ((float) $object['width'] / 2);
                                $centerY = (float) $object['y'] + ((float) $object['height'] / 2);
                                $rotation = (float) ($object['rotation'] ?? 0);
                                $opacity = max(0, min(1, (float) ($object['opacity'] ?? 1)));
                            @endphp
                            <g data-map-object="{{ $object['id'] }}" data-object-type="{{ $object['type'] }}" data-object-label="{{ $object['label'] }}" opacity="{{ $opacity }}" @if($rotation !== 0.0) transform="rotate({{ $rotation }} {{ $centerX }} {{ $centerY }})" @endif>
                                @if(!empty($object['assetUrl']))
                                    <image href="{{ $object['assetUrl'] }}" x="{{ $object['x'] }}" y="{{ $object['y'] }}" width="{{ $object['width'] }}" height="{{ $object['height'] }}" preserveAspectRatio="none" />
                                @else
                                    <rect x="{{ $object['x'] }}" y="{{ $object['y'] }}" width="{{ $object['width'] }}" height="{{ $object['height'] }}" fill="{{ $object['color'] }}" />
                                @endif
                                @if(($object['type'] ?? '') === 'wall')
                                    <rect class="object-border" x="{{ $object['x'] }}" y="{{ $object['y'] }}" width="{{ $object['width'] }}" height="{{ $object['height'] }}" />
                                @endif
                            </g>
                        @endforeach
                    </g>
                @endif
            @endforeach

            <g data-layer-type="grid">
                @for($x = 0; $x <= ($grid['width'] ?? $map->width); $x++)
                    <line class="grid-line" x1="{{ $x * $cellSize }}" y1="0" x2="{{ $x * $cellSize }}" y2="{{ $pixelHeight }}" />
                @endfor
                @for($y = 0; $y <= ($grid['height'] ?? $map->height); $y++)
                    <line class="grid-line" x1="0" y1="{{ $y * $cellSize }}" x2="{{ $pixelWidth }}" y2="{{ $y * $cellSize }}" />
                @endfor
            </g>

            @foreach($layers as $layer)
                @if(($layer['type'] ?? '') === 'tokens')
                    <g data-layer-type="tokens" opacity="{{ $layer['opacity'] ?? 1 }}">
                        @foreach(($layer['objects'] ?? []) as $object)
                            @php
                                $centerX = (float) $object['x'] + ((float) $object['width'] / 2);
                                $centerY = (float) $object['y'] + ((float) $object['height'] / 2);
                                $rotation = (float) ($object['rotation'] ?? 0);
                                $opacity = max(0, min(1, (float) ($object['opacity'] ?? 1)));
                            @endphp
                            <g data-map-object="{{ $object['id'] }}" data-object-type="{{ $object['type'] }}" data-object-label="{{ $object['label'] }}" opacity="{{ $opacity }}" @if($rotation !== 0.0) transform="rotate({{ $rotation }} {{ $centerX }} {{ $centerY }})" @endif>
                                @if(!empty($object['assetUrl']))
                                    <image href="{{ $object['assetUrl'] }}" x="{{ $object['x'] }}" y="{{ $object['y'] }}" width="{{ $object['width'] }}" height="{{ $object['height'] }}" preserveAspectRatio="none" />
                                @else
                                    <rect x="{{ $object['x'] }}" y="{{ $object['y'] }}" width="{{ $object['width'] }}" height="{{ $object['height'] }}" fill="{{ $object['color'] }}" />
                                @endif
                            </g>
                        @endforeach
                    </g>
                @endif
            @endforeach

            <rect class="map-border" x="0" y="0" width="{{ $pixelWidth }}" height="{{ $pixelHeight }}" />
        </svg>
    </main>
</section>
</body>
</html>
