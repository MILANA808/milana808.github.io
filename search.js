/**
 * AKSI MATRIX — apps catalog + search helpers
 * Internet search requires backend + Tavily/Serper API key
 */
window.AKSI_APPS = [
  {id:1, name:"MoodMirror", description:"AI mood analysis", category:"Health", status:"concept"},
  {id:2, name:"MindMirror", description:"Cognitive journaling", category:"Health", status:"concept"},
  {id:3, name:"MindLink", description:"Connect ideas", category:"Utility", status:"concept"},
  {id:4, name:"HealthScan", description:"Health metrics", category:"Health", status:"concept"},
  {id:5, name:"Mentor", description:"AI mentor", category:"Education", status:"concept"},
  {id:6, name:"Family", description:"Family organizer", category:"Social", status:"concept"},
  {id:7, name:"Aura", description:"Energy tracker", category:"Lifestyle", status:"concept"},
  {id:8, name:"AksiLove", description:"Compatibility", category:"Social", status:"concept"},
  {id:9, name:"MoodRadio", description:"Mood playlists", category:"Entertainment", status:"concept"},
  {id:10, name:"AksiShopping", description:"Smart shopping", category:"Utility", status:"concept"},
  {id:11, name:"AIStylist", description:"Style advice", category:"Lifestyle", status:"concept"},
  {id:12, name:"EcoGaze", description:"Eco metrics", category:"Utility", status:"concept"},
  {id:13, name:"DreamJournal", description:"Dream diary", category:"Health", status:"concept"},
  {id:14, name:"AksiCompanion", description:"AI friend", category:"Social", status:"concept"},
  {id:15, name:"DressUpAR", description:"Virtual try-on", category:"Lifestyle", status:"concept"},
  {id:16, name:"GlobalID", description:"Decentralized ID", category:"Utility", status:"live"},
  {id:17, name:"AksiChat", description:"Secure chat", category:"Social", status:"live"},
  {id:18, name:"LifeScan", description:"Life balance", category:"Health", status:"concept"},
  {id:19, name:"TimeCapsule", description:"Future messages", category:"Utility", status:"concept"},
  {id:20, name:"TeleHelp", description:"Emergency", category:"Health", status:"concept"},
  {id:21, name:"StoryAI", description:"AI storytelling", category:"Entertainment", status:"concept"},
  {id:22, name:"QuantumLab", description:"Circuit playground", category:"Science", status:"live"},
  {id:23, name:"Globe5D", description:"Live map (concept)", category:"Platform", status:"wip"},
  {id:24, name:"VoiceAKSI", description:"Голосовой агент", category:"Interface", status:"live"},
  {id:25, name:"Resonance", description:"Field metrics", category:"Core", status:"live"}
];

window.AKSI_localSearch = function(query) {
  var q = (query || "").toLowerCase().trim();
  if (!q) return [];
  return window.AKSI_APPS.filter(function(a) {
    return a.name.toLowerCase().indexOf(q) !== -1 ||
           a.description.toLowerCase().indexOf(q) !== -1 ||
           a.category.toLowerCase().indexOf(q) !== -1;
  });
};

window.AKSI_webSearch = async function(apiBase, query) {
  // Tries backend v2 search endpoint; fails gracefully offline
  var endpoints = [
    apiBase + "/aksi/v2/tools/search",
    apiBase + "/api/search"
  ];
  for (var i = 0; i < endpoints.length; i++) {
    try {
      var res = await fetch(endpoints[i], {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ query: query, num_results: 5 }),
        signal: AbortSignal.timeout(8000)
      });
      if (res.ok) return await res.json();
    } catch (e) {}
  }
  return { success: false, error: "Backend search unavailable. Set API keys (Tavily/Serper) and run backend." };
};
