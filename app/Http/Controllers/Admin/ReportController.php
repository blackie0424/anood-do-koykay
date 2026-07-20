<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\Song;
use App\Models\SongReport;
use Illuminate\Http\Request;
use Inertia\Inertia;

class ReportController extends Controller
{
    public function store(Request $request, Song $song)
    {
        $data = $request->validate([
            'report_type' => 'required|string|max:100',
            'note'        => 'nullable|string|max:1000',
        ]);

        $song->reports()->create($data);

        return response()->json(['ok' => true], 201);
    }

    public function index()
    {
        $reports = SongReport::with('song:id,title_native,title_zh')
            ->orderBy('resolved')
            ->orderByDesc('created_at')
            ->get();

        return Inertia::render('Admin/Reports', ['reports' => $reports]);
    }

    public function updateResolved(SongReport $report)
    {
        $report->update(['resolved' => !$report->resolved]);

        return response()->json(['resolved' => $report->resolved]);
    }
}
