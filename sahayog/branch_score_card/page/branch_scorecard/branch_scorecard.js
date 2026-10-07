function sahayog_inject_style(id, css){
    $("#" + id).remove();
    $("head").append('<style id="' + id + '">' + css + '</style>');
}

function sahayog_cell_number(cell_value){
    if(
        cell_value !== null &&
        cell_value !== undefined &&
        typeof cell_value === "object" &&
        Number.isFinite(Number(cell_value.average))
    ){
        return Number(cell_value.average);
    }
    if(Number.isFinite(Number(cell_value))){
        return Number(cell_value);
    }
    return null;
}

function sahayog_short_month(month_name){
    return String(month_name || "").trim().slice(0, 3);
}

frappe.pages["branch-scorecard"].on_page_load=function(wrapper){
$("#branch-scorecard-style").remove();
$("<style>")
.attr("id","branch-scorecard-style")
.prop("type","text/css")
.html(`
:root{
--page-bg:#fff;
--card-bg:#fff;
--soft-bg:#edf4f5;
--hover-bg:#edf5f6;
--border:#c5d5d7;
--border-light:#dce7e8;
--text:#172b2e;
--text-dark:#163337;
--text-muted:#405c60;
--text-light:#587277;
--teal-dark:#3A6F75;
--teal-light:#6AA0A4;
--teal-soft:#eaf3f4;
--teal-border:#b8ced0;
--green:#059669;
--orange:#d97706;
--red:#dc2626
}
html,
body{
overflow:auto!important;
height:auto!important;
min-height:100%!important;
scroll-behavior:smooth
}
.layout-main-section{
overflow:visible!important;
height:auto!important;
min-height:100vh!important;
background:#fff!important
}
.layout-main-section-wrapper{
overflow:visible!important;
height:auto!important;
min-height:100vh!important
}
.page-container{
overflow:visible!important;
height:auto!important;
min-height:100vh!important
}
.branch-scorecard-page{
position:relative;
box-sizing:border-box;
width:100%;
height:auto!important;
min-height:calc(100vh - 85px);
padding:10px 14px 40px;
overflow:visible!important;
background:#fff;
color:var(--text);
font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,Arial,sans-serif
}
.branch-scorecard-page *,
.branch-scorecard-page *::before,
.branch-scorecard-page *::after{
box-sizing:border-box
}
.branch-scorecard-page h2,
.branch-scorecard-page h3,
.branch-scorecard-page h4{
color:var(--text-dark)!important
}
.branch-scorecard-page p{
color:var(--text-muted)
}
.scorecard-layout{
display:flex;
width:100%;
height:auto!important;
min-height:0;
overflow:visible!important;
background:#fff
}
.scorecard-sidebar{
width:315px;
min-width:315px;
height:calc(100vh - 165px);
min-height:450px;
max-height:calc(100vh - 165px);
padding:2px 16px 10px 2px;
border-right:2px solid var(--teal-dark);
display:flex;
flex-direction:column;
overflow:hidden;
position:sticky;
top:10px;
background:#fff
}
.branch-search-field{
position:relative;
width:100%;
height:39px;
margin-bottom:11px
}
.branch-search-label{
position:absolute;
z-index:3;
top:-5px;
left:11px;
padding:0 5px;
background:#fff;
color:var(--teal-dark);
font-size:11px;
font-weight:900;
line-height:14px;
letter-spacing:.4px;
pointer-events:none
}
.branch-search-field input{
width:100%;
height:39px;
margin-bottom:0;
padding:7px 38px 7px 12px;
border:1px solid var(--teal-border);
border-radius:8px;
background:#fff;
color:var(--text-dark);
font-size:13px;
font-weight:650
}
.branch-search-field input::placeholder{
color:var(--text-light);
opacity:1
}
.branch-search-field input:focus{
border-color:var(--teal-dark);
box-shadow:0 0 0 2px rgba(58,111,117,.08);
outline:none
}
.branch-search-clear{
position:absolute;
z-index:4;
top:50%;
right:9px;
width:22px;
height:22px;
display:none;
align-items:center;
justify-content:center;
transform:translateY(-50%);
border:0;
border-radius:50%;
background:transparent;
color:#6b7f82;
font-size:18px;
font-weight:700;
line-height:1;
cursor:pointer;
padding:0
}
.branch-search-clear:hover{
background:var(--teal-soft);
color:var(--teal-dark)
}
.branch-search-clear.visible{
display:flex
}
.sidebar-scroll-content{
flex:1;
min-height:0;
overflow-y:auto;
overflow-x:hidden;
padding-right:3px;
background:#fff;
scroll-behavior:smooth
}
.scorecard-list-item{
width:100%;
min-height:48px;
display:flex;
align-items:center;
justify-content:space-between;
gap:8px;
margin-bottom:5px;
padding:8px 10px;
border:1px solid transparent;
border-radius:8px;
background:transparent;
color:var(--text-dark);
cursor:pointer;
transition:all .15s ease
}
.scorecard-list-item:hover{
background:var(--hover-bg);
border-color:var(--teal-border)
}
.scorecard-list-item.active{
background:
linear-gradient(
90deg,
rgba(58,111,117,.14),
rgba(106,160,164,.06)
);
border-color:var(--teal-light);
box-shadow:inset 2px 0 0 rgba(58,111,117,.75)
}
.branch-item-content{
display:flex;
align-items:center;
min-width:0;
overflow:hidden
}
.branch-avatar{
width:32px;
height:32px;
min-width:32px;
display:flex;
align-items:center;
justify-content:center;
margin-right:9px;
border:1px solid var(--border);
border-radius:50%;
background:var(--soft-bg);
color:var(--text-dark);
font-size:13px;
font-weight:900
}
.scorecard-list-item:hover .branch-avatar,
.scorecard-list-item.active .branch-avatar{
background:var(--teal-dark);
border-color:var(--teal-dark);
color:#fff
}
.scorecard-branch-name{
overflow:hidden;
color:var(--text-dark);
font-size:13px;
font-weight:850;
line-height:1.25;
text-overflow:ellipsis;
white-space:nowrap
}
.scorecard-list-item.active .scorecard-branch-name{
color:var(--teal-dark)!important
}
.scorecard-record-info{
display:flex;
gap:4px;
margin-top:3px;
color:var(--text-muted);
font-size:10px;
font-weight:650;
line-height:1.2
}
.active-check{
display:none;
flex-shrink:0;
color:var(--teal-dark);
font-size:15px;
font-weight:900
}
.scorecard-list-item.active .active-check{
display:block
}
.scorecard-main{
flex:1;
min-width:0;
min-height:0;
height:auto!important;
display:flex;
flex-direction:column;
overflow:visible!important;
padding-left:16px;
background:#fff
}
.dashboard-top-nav{
flex:0 0 54px;
height:54px;
min-height:54px;
width:100%;
display:flex;
align-items:center;
gap:10px;
padding:0 0 10px;
border-bottom:2px solid var(--teal-border);
position:relative;
background:#fff
}
.fy-container{
width:155px;
min-width:155px;
height:38px;
display:flex;
align-items:center;
flex-shrink:0
}
.fy-field{
position:relative;
width:100%;
height:38px
}
.fy-field-label{
position:absolute;
z-index:3;
top:-5px;
left:11px;
padding:0 5px;
background:#fff;
color:var(--teal-dark);
font-size:12px;
font-weight:900;
line-height:14px;
letter-spacing:.4px;
pointer-events:none
}
.fy-select{
width:100%;
height:38px;
padding:5px 10px;
border:1px solid var(--teal-border);
border-radius:8px;
background:#fff;
color:var(--text-dark);
font-size:12px;
font-weight:850;
outline:none;
cursor:pointer;
appearance:auto
}
.fy-select:hover{
border-color:var(--teal-light)
}
.fy-select:focus{
border-color:var(--teal-dark);
box-shadow:0 0 0 2px rgba(58,111,117,.08)
}
.months-scroll{
flex:1;
min-width:0;
height:42px;
display:flex;
align-items:center;
justify-content:flex-start;
gap:10px;
overflow-x:auto;
overflow-y:hidden;
padding:2px 2px 4px 8px;
scrollbar-width:thin;
background:#fff
}
.month-pill{
flex-shrink:0;
min-width:48px;
padding:9px 14px;
border:1px solid var(--teal-border);
border-radius:20px;
background:#fff;
color:var(--text-dark);
font-size:11px;
font-weight:850;
letter-spacing:.2px;
text-align:center;
cursor:pointer;
white-space:nowrap;
transition:all .15s ease
}
.month-pill:hover{
border-color:var(--teal-dark);
color:var(--teal-dark);
background:var(--teal-soft)
}
.month-pill.active{
background:
linear-gradient(
135deg,
#3A6F75 0%,
#6AA0A4 100%
);
border-color:#315B87;
color:#fff;
box-shadow:
0 2px 5px rgba(58,111,117,.14),
inset 0 1px 1px rgba(255,255,255,.20)
}
.scorecard-refresh-btn{
height:28px;
min-width:62px;
padding:0 8px;
flex-shrink:0;
display:inline-flex;
align-items:center;
justify-content:center;
gap:4px;
border:1px solid #cfe1e4;
border-radius:999px;
background:#f4fafb;
color:#52787d;
font-size:10px;
font-weight:700;
cursor:pointer;
transition:all .15s ease
}
.scorecard-refresh-btn:hover{
background:#eaf5f6;
border-color:#a9cdd1;
color:#3A6F75
}
.scorecard-refresh-btn:active{
transform:scale(.94)
}
.scorecard-refresh-btn:disabled{
opacity:.65;
cursor:wait
}
.scorecard-refresh-btn .fa{
font-size:10px;
transition:transform .15s ease
}
.scorecard-content{
flex:0 0 auto;
min-width:0;
min-height:0;
height:auto!important;
padding:12px 2px 30px 0;
overflow:visible!important;
background:#fff
}
#scorecard-details{
overflow:visible!important;
max-height:none!important;
height:auto!important;
min-height:0!important
}
.empty-scorecard{
padding:100px 20px;
text-align:center;
color:var(--text-muted)
}
.empty-icon{
margin-bottom:14px;
font-size:50px
}
.empty-scorecard h3{
margin:0 0 8px;
color:var(--text-dark)!important;
font-size:19px!important;
font-weight:900
}
.empty-scorecard p{
margin:0;
font-size:13px;
font-weight:600
}
.dashboard-grid-split{
display:block;
width:100%;
height:auto
}
.metric-card,
.branch-info-card,
.function-card,
.score-breakdown-card{
border:1px solid var(--border);
border-radius:10px;
background:var(--card-bg);
box-shadow:0 1px 5px rgba(15,23,42,.025)
}
.metric-card{
position:relative;
margin-bottom:12px;
padding:15px 16px
}
.metric-card:hover,
.function-card:hover,
.branch-info-card:hover,
.score-breakdown-card:hover{
border-color:var(--teal-light)
}
.metric-title{
margin-bottom:8px;
color:var(--text-muted);
font-size:12px;
font-weight:900;
letter-spacing:.55px;
line-height:1.3;
text-transform:uppercase
}
.metric-value-row{
display:flex;
align-items:center;
justify-content:space-between;
gap:10px
}
.metric-main-val{
color:var(--text-dark);
font-size:29px;
font-weight:950;
line-height:1.1
}
.metric-main-val span{
color:var(--text-muted);
font-size:14px;
font-weight:800
}
.metric-badge{
padding:5px 9px;
border-radius:5px;
background:#ecfdf5;
color:#047857;
font-size:12px;
font-weight:900
}
.metric-icon-badge{
width:35px;
height:35px;
display:flex;
align-items:center;
justify-content:center;
border:1px solid #c5dfe1;
border-radius:8px;
background:var(--teal-soft);
color:var(--teal-dark);
font-size:16px
}
.card-progress-bg,
.progress-bar-bg{
position:relative;
width:100%;
height:9px;
overflow:hidden;
border-radius:6px;
background:linear-gradient(
to bottom,
#dfe4e8,
#f2f4f6 45%,
#dfe3e7
);
box-shadow:
inset 0 1px 2px rgba(15,23,42,.07),
inset 0 -1px 1px rgba(255,255,255,.75),
0 1px 1px rgba(15,23,42,.035)
}
.card-progress-fill,
.progress-bar-fill{
position:relative;
height:100%;
border-radius:7px;
overflow:hidden;
transition:width .8s cubic-bezier(.22,1,.36,1);
box-shadow:
inset 0 1px 1px rgba(255,255,255,.40),
inset 0 -1px 2px rgba(0,0,0,.10),
0 1px 2px rgba(15,23,42,.08)
}
.card-progress-fill::before,
.progress-bar-fill::before{
content:"";
position:absolute;
inset:0;
border-radius:inherit;
background:linear-gradient(
135deg,
rgba(255,255,255,.24) 25%,
transparent 25%,
transparent 50%,
rgba(255,255,255,.24) 50%,
rgba(255,255,255,.24) 75%,
transparent 75%
);
background-size:28px 28px;
animation:progressStripeMove 3.8s linear infinite;
pointer-events:none
}
.card-progress-fill::after,
.progress-bar-fill::after{
content:"";
position:absolute;
top:1px;
left:3px;
right:3px;
height:35%;
border-radius:5px;
background:linear-gradient(
to bottom,
rgba(255,255,255,.30),
rgba(255,255,255,.06)
);
pointer-events:none
}
@keyframes progressStripeMove{
from{background-position:0 0}
to{background-position:28px 0}
}
.progress-green{
background:linear-gradient(
to bottom,
#34d399 0%,
#10b981 45%,
#059669 100%
)
}
.progress-yellow{
background:linear-gradient(
to bottom,
#fbbf24 0%,
#f59e0b 45%,
#d97706 100%
)
}
.progress-orange{
background:linear-gradient(
to bottom,
#fb923c 0%,
#f97316 45%,
#ea580c 100%
)
}
.progress-red{
background:linear-gradient(
to bottom,
#f87171 0%,
#ef4444 45%,
#dc2626 100%
)
}
.card-progress-fill:hover,
.progress-bar-fill:hover{
filter:brightness(1.05)
}
.card-progress-bg::after,
.progress-bar-bg::after{
content:"";
position:absolute;
inset:0;
border-radius:inherit;
pointer-events:none;
box-shadow:
inset 0 1px 1px rgba(255,255,255,.55),
inset 0 -1px 1px rgba(15,23,42,.06)
}
.card-progress-bg{
margin-top:13px
}
.score-breakdown-card{
margin-top:15px;
margin-bottom:12px;
padding:15px 16px
}
.score-breakdown-title{
margin-bottom:9px;
color:var(--text-dark);
font-size:13px;
font-weight:900;
letter-spacing:.5px;
text-transform:uppercase
}
.score-breakdown-legend{
display:flex;
align-items:center;
gap:18px;
margin-bottom:12px
}
.score-breakdown-legend-item{
display:flex;
align-items:center;
gap:6px;
color:var(--text-muted);
font-size:11px;
font-weight:800
}
.score-breakdown-legend-box{
width:11px;
height:11px;
border-radius:2px
}
.score-breakdown-legend-score{
background:var(--teal-dark)
}
.score-breakdown-legend-max{
background:#cbd5e1
}
.score-breakdown-chart{
position:relative;
width:100%;
height:285px;
padding-left:48px
}
.score-breakdown-ruler{
position:absolute;
top:5px;
left:0;
width:42px;
height:210px;
display:flex;
flex-direction:column;
justify-content:space-between;
align-items:flex-end;
padding-right:7px
}
.score-breakdown-ruler-value{
color:var(--text-muted);
font-size:10px;
font-weight:800;
line-height:1
}
.score-breakdown-plot{
position:relative;
width:100%;
height:210px;
border-left:1px solid var(--border);
border-bottom:1px solid var(--border);
background:
linear-gradient(
90deg,
rgba(58,111,117,.025),
rgba(106,160,164,.015)
)
}
.score-breakdown-grid-line{
position:absolute;
left:0;
width:100%;
height:1px;
border-top:1px dashed #dbe2ea
}
.score-breakdown-zero-line{
position:absolute;
left:0;
width:100%;
height:2px;
background:#64748b;
z-index:3
}
.score-breakdown-bars{
position:absolute;
inset:0;
display:flex;
align-items:stretch;
justify-content:space-around;
gap:8px;
width:100%;
height:100%;
padding:0 12px;
z-index:4
}
.score-breakdown-bar-group{
position:relative;
display:flex;
flex:1;
align-items:stretch;
justify-content:center;
height:100%;
min-width:85px
}
.score-breakdown-bar-item{
position:relative;
display:block;
flex:0 1 42px;
height:100%;
min-width:28px;
max-width:44px
}
.score-breakdown-bar{
position:absolute;
left:50%;
width:100%;
max-width:40px;
min-height:3px;
transform:translateX(-50%);
border-radius:4px;
transition:top .3s ease,height .3s ease
}
.score-breakdown-score-bar{
background:
linear-gradient(
to bottom,
#6AA0A4,
#3A6F75
)
}
.score-breakdown-negative-bar{
background:#dc2626
}
.score-breakdown-max-bar{
background:#cbd5e1
}
.score-breakdown-bar-value{
position:absolute;
left:50%;
transform:translateX(-50%);
color:var(--text-dark);
font-size:13px;
font-weight:900;
white-space:nowrap;
z-index:6
}
.score-breakdown-negative-value{
color:#dc2626
}
.score-breakdown-bar-label{
position:absolute;
top:calc(100% + 12px);
left:50%;
width:150px;
transform:translateX(-50%);
overflow:hidden;
color:var(--text-muted);
font-size:9px;
font-weight:750;
line-height:1.2;
text-align:center;
text-overflow:ellipsis;
white-space:nowrap
}
.score-breakdown-zero-label{
position:absolute;
right:4px;
color:#475569;
font-size:9px;
font-weight:900;
transform:translateY(-50%);
z-index:7
}
.score-breakdown-empty{
display:flex;
align-items:center;
justify-content:center;
height:180px;
color:var(--text-muted);
font-size:12px;
font-weight:650
}
.branch-info-card{
margin-bottom:12px;
padding:14px
}
.info-row{
display:flex;
align-items:center;
justify-content:space-between;
gap:10px;
padding:8px 0;
border-bottom:1px solid var(--border-light);
font-size:12px
}
.info-row:last-child{
border-bottom:none
}
.info-label{
color:var(--text-muted);
font-weight:700
}
.info-val{
max-width:58%;
overflow:hidden;
color:var(--text-dark);
font-weight:850;
text-align:right;
text-overflow:ellipsis;
white-space:nowrap
}
.functions-grid-right{
display:grid;
grid-template-columns:repeat(3,minmax(0,1fr));
gap:12px;
align-items:stretch;
width:100%;
margin-top:12px
}
.function-card{
min-width:0;
min-height:180px;
height:auto;
padding:14px;
display:flex;
flex-direction:column
}
.function-header{
display:flex;
align-items:center;
justify-content:space-between;
gap:10px;
margin-bottom:9px;
padding-bottom:9px;
border-bottom:1px solid var(--border-light);
flex-shrink:0
}
.function-title{
min-width:0;
overflow:hidden;
color:var(--text-dark)!important;
font-size:14px;
font-weight:900;
line-height:1.3;
text-overflow:ellipsis
}
.function-link,
.scorecard-function-nav-link{
display:flex;
align-items:center;
gap:7px;
min-width:0;
overflow:hidden;
color:var(--teal-dark)!important;
font-size:14px;
font-weight:900;
line-height:1.3;
cursor:pointer;
text-decoration:none!important
}
.function-link:hover,
.scorecard-function-nav-link:hover{
color:#2f5f65!important;
text-decoration:underline!important
}
.function-link-text{
min-width:0;
overflow:hidden;
text-overflow:ellipsis;
white-space:nowrap
}
.function-edit-icon{
width:22px;
height:22px;
min-width:22px;
display:inline-flex;
align-items:center;
justify-content:center;
border:1px solid var(--teal-border);
border-radius:5px;
background:#fff;
color:var(--teal-dark);
font-size:10px;
cursor:pointer;
text-decoration:none!important;
transition:all .15s ease
}
.function-edit-icon:hover{
background:var(--teal-soft);
border-color:var(--teal-dark);
color:var(--teal-dark)
}
.function-total{
flex-shrink:0;
padding:4px 8px;
border-radius:5px;
background:var(--teal-soft);
color:var(--teal-dark);
font-size:14px;
font-weight:800;
white-space:nowrap
}
.parameter-item{
padding:8px 0;
border-bottom:1px dashed #dbe2ea;
flex:0 0 auto
}
.parameter-item:last-child{
border-bottom:none
}
.parameter-info{
display:flex;
align-items:flex-start;
justify-content:space-between;
gap:10px;
margin-bottom:5px;
color:var(--text-muted);
font-size:12px;
font-weight:650;
line-height:1.35
}
.parameter-name{
min-width:0
}
.parameter-values{
flex-shrink:0;
color:var(--text-dark);
font-size:13px;
font-weight:750;
white-space:nowrap
}
.progress-bar-bg{
height:9px
}
.combined-branch-score-card{
width:100%;
height:168px;
min-height:168px;
margin-bottom:0;
padding:0;
border:1px solid #cbdfe1;
border-radius:12px;
background:#fff;
box-shadow:
0 1px 5px rgba(58,111,117,.035);
overflow:hidden
}
.combined-branch-score-card:hover{
border-color:#b6d0d2;
box-shadow:
0 2px 8px rgba(58,111,117,.055)
}
.combined-main-row{
width:100%;
height:100%;
display:flex;
align-items:stretch;
gap:24px;
background:#fff
}
.combined-score-header{
flex:0 0 34%;
min-width:300px;
display:flex;
flex-direction:column;
justify-content:center;
padding:12px 24px 12px 20px;
border-right:1px solid #dce9ea;
background:
linear-gradient(
135deg,
#f7fbfb 0%,
#eef6f7 52%,
#e6f1f2 100%
);
position:relative
}
.combined-score-header::before{
content:"";
position:absolute;
left:0;
top:0;
bottom:0;
width:4px;
background:#b9d5d7
}
.combined-score-title{
margin-bottom:7px;
overflow:hidden;
color:var(--teal-dark);
font-size:19px;
font-weight:950;
letter-spacing:.1px;
line-height:1.25;
text-overflow:ellipsis;
white-space:nowrap
}
.combined-score-title::before{
content:"";
display:none
}
.combined-score-meta{
margin-top:0;
color:#587277;
font-size:11px;
font-weight:750;
line-height:1.45
}
.combined-score-meta strong{
color:var(--text-dark);
font-weight:950
}
.combined-grade-score-row{
display:flex;
align-items:center;
gap:6px;
min-height:32px;
margin-top:8px
}
.combined-grade-score{
color:var(--teal-dark);
font-size:17px;
font-weight:950;
line-height:1.25
}
.combined-score-icon{
width:30px;
height:30px;
min-width:30px;
display:flex;
align-items:center;
justify-content:center;
border:1px solid #c3dcde;
border-radius:8px;
background:#fff;
color:var(--teal-dark);
font-size:15px;
box-shadow:0 1px 3px rgba(58,111,117,.05)
}
.combined-branch-details{
flex:1 1 auto;
min-width:0;
display:flex;
flex-direction:column;
justify-content:center;
padding-right:16px;
background:#fff
}
.combined-branch-details-title{
margin:0 0 9px;
color:var(--teal-dark);
font-size:12px;
font-weight:900;
letter-spacing:.45px;
line-height:1.4;
text-transform:uppercase
}
.combined-info-list{
width:100%;
display:grid;
grid-template-columns:repeat(3,minmax(0,1fr));
background:#fff
}
.combined-info-row{
min-width:0;
display:flex;
flex-direction:column;
align-items:flex-start;
justify-content:flex-start;
gap:5px;
min-height:58px;
padding:8px 14px;
background:#fff;
font-size:12px;
border-right:1px solid var(--border-light)
}
.combined-info-row:nth-child(3n+1){
padding-left:0!important
}
.combined-info-row:nth-child(3n){
padding-right:0!important;
border-right:none
}
.combined-info-label{
width:100%;
overflow:hidden;
color:var(--text-muted);
font-size:11px;
font-weight:750;
line-height:1.3;
text-overflow:ellipsis;
white-space:nowrap
}
.combined-info-val{
width:100%;
min-width:0;
max-width:100%;
overflow:hidden;
color:var(--text-dark);
font-size:12px;
font-weight:850;
line-height:1.4;
text-align:left;
text-overflow:ellipsis;
white-space:nowrap
}
.scorecard-view-tabs{
width:100%;
height:58px;
min-height:58px;
display:flex;
align-items:center;
justify-content:flex-start;
gap:8px;
margin-bottom:10px;
padding:6px 8px;
background:#fff;
border:1px solid #d7e5e6;
border-radius:11px;
box-shadow:0 2px 8px rgba(58,111,117,.045)
}
.scorecard-logged-user{
height:38px;
min-width:165px;
display:flex;
align-items:center;
gap:9px;
margin-left:8px;
padding:3px 9px 3px 4px;
border:1px solid #c9dfe3;
border-radius:999px;
background:#f4fafb;
box-shadow:0 2px 7px rgba(58,111,117,.08);
flex:0 0 auto;
}

.scorecard-user-avatar{
width:28px;
height:28px;
display:flex;
align-items:center;
justify-content:center;
border-radius:50%;
background:#e1f0f2;
color:#3A6F75;
font-size:12px;
flex:0 0 28px;
box-shadow:0 1px 3px rgba(58,111,117,.10);
}

.scorecard-user-details{
min-width:0;
display:flex;
flex-direction:column;
justify-content:center;
line-height:1.15;
}

.scorecard-user-name{
max-width:120px;
overflow:hidden;
text-overflow:ellipsis;
white-space:nowrap;
color:#244b52;
font-size:12px;
font-weight:900;
}

.scorecard-user-id{
max-width:155px;
overflow:hidden;
text-overflow:ellipsis;
white-space:nowrap;
margin-top:3px;
color:#718b90;
font-size:10px;
font-weight:750;
}

.scorecard-logged-user:hover{
border-color:#a9cdd1;
background:#edf7f8;
box-shadow:0 3px 9px rgba(58,111,117,.12);
transform:translateY(-1px);
}

.scorecard-view-tab{
position:relative;
height:42px;
min-width:130px;
display:flex;
align-items:center;
justify-content:center;
gap:8px;
padding:8px 20px;
border:1px solid transparent;
border-radius:8px;
background:transparent;
color:var(--text-muted);
font-size:15px;
font-weight:850;
letter-spacing:.1px;
text-align:center;
cursor:pointer;
transition:
background .18s ease,
color .18s ease,
border-color .18s ease,
box-shadow .18s ease,
transform .18s ease
}
.scorecard-view-tab:hover{
background:#f1f7f7;
border-color:#c7dcde;
color:var(--teal-dark);
transform:translateY(-1px)
}
.scorecard-view-tab:active{
transform:translateY(0)
}
.scorecard-view-tab::before{
content:"";
width:7px;
height:7px;
border-radius:50%;
background:#a7bec1;
transition:all .18s ease
}
.scorecard-view-tab:hover::before{
background:var(--teal-light);
box-shadow:0 0 0 4px rgba(106,160,164,.10)
}
.scorecard-view-tab.active{
border-color:#3A6F75;
background:
linear-gradient(
135deg,
#48848b 0%,
#5F9297 55%,
#6AA0A4 100%
);
color:#fff;
font-weight:850;
box-shadow:
0 3px 8px rgba(58,111,117,.18),
inset 0 1px 1px rgba(255,255,255,.18)
}
.scorecard-view-tab.active::before{
background:#fff;
box-shadow:
0 0 0 3px rgba(255,255,255,.16)
}
.scorecard-view-container{
width:100%;
height:auto!important;
min-height:0;
overflow:visible!important
}
.scorecard-view-panel{
width:100%;
height:auto!important;
min-height:0;
overflow:visible!important
}
/* =========================================================
   ZONE WISE TABLE
   ========================================================= */
.zone-wise-panel,
.com-wise-panel{
width:100%;
height:auto!important;
min-height:500px;
display:block;
background:#fff;
overflow:visible!important
}
.zone-wise-container{
width:100%;
padding:4px 0 20px
}
.zone-wise-header{
display:flex;
align-items:flex-start;
justify-content:space-between;
gap:15px;
margin-bottom:14px;
padding:14px 16px;
border:1px solid var(--border);
border-radius:10px;
background:#fff;
box-shadow:0 1px 5px rgba(15,23,42,.025)
}
.zone-wise-title{
color:var(--teal-dark);
font-size:16px;
font-weight:950;
line-height:1.4
}
.zone-wise-subtitle{
margin-top:4px;
color:var(--text-muted);
font-size:11px;
font-weight:650
}
.zone-wise-table-wrap{
width:100%;
overflow-x:auto;
border:1px solid #9fb4b7;
border-radius:8px;
background:#fff;
box-shadow:none
}
.zone-wise-table{
width:100%;
min-width:850px;
border-collapse:collapse;
border-spacing:0;
background:#fff;
table-layout:auto
}
.zone-wise-table th{
position:sticky;
top:0;
z-index:2;
padding:12px 14px;
border:1px solid #9fb4b7;
background:#e7f0f1;
color:#1f4d52;
font-size:13px;
font-weight:750;
text-align:center;
white-space:nowrap;
line-height:1.4
}
.zone-wise-table th:first-child{
position:sticky;
left:0;
z-index:4;
min-width:180px;
text-align:left;
background:#e7f0f1;
color:#1f4d52
}
.zone-wise-table td{
padding:12px 14px;
border:1px solid #c5d4d6;
background:#fff;
color:#17383c;
font-size:13px;
font-weight:650;
text-align:center;
white-space:nowrap;
line-height:1.4
}
.zone-wise-table td:first-child{
position:sticky;
left:0;
z-index:1;
background:#fff;
color:#24545a;
font-weight:950;
text-align:left
}
/* =========================================================
   ZONE WISE TABLE - NEUTRAL ROWS
   ========================================================= */

.zone-wise-table tbody tr:not(.grand-total-row) td{
background:#ffffff!important;
}

.zone-wise-table tbody tr:not(.grand-total-row) td:first-child{
background:#ffffff!important;
color:#24545a!important;
}

.zone-wise-table tbody tr:not(.grand-total-row):hover td{
background:#f7f7f7!important;
}

.zone-wise-table tbody tr:not(.grand-total-row):hover td:first-child{
background:#f7f7f7!important;
}

/* =========================================================
   ZONE WISE SCORE VALUES
   ========================================================= */

.zone-name-cell{
font-weight:750!important;
color:#24545a!important;
letter-spacing:.1px;
font-size:13px!important;
line-height:1.4
}

.zone-score-value{
display:inline-block;
min-width:48px;
font-size:14px;
font-weight:900;
line-height:1.4
}

.zone-score-available{
color:#17383c!important;
font-weight:900!important
}

.zone-score-unavailable{
color:#687d80!important;
font-weight:750!important
}

/* =========================================================
   GRAND TOTAL
   ========================================================= */

.zone-wise-table .grand-total-row td{
background:#eeeeee!important;
border-top:2px solid #b8b8b8!important;
border-bottom:1px solid #c8c8c8!important;
color:#3f4a4d!important;
font-weight:950!important
}

.zone-wise-table .grand-total-row td:first-child{
background:#eeeeee!important;
color:#3f4a4d!important;
font-weight:950!important
}

.grand-total-name-cell{
background:#eeeeee!important;
color:#3f4a4d!important;
font-size:14px!important;
font-weight:950!important
}

.grand-total-row .zone-score-value{
color:#3f4a4d!important;
font-size:14px!important;
font-weight:950!important
}

/* =========================================================
   REGION WISE TREND GRAPH
   ========================================================= */
.region-trend-card{
width:100%;
margin-top:18px;
padding:18px;
border:1px solid #d5e1e3;
border-radius:12px;
background:#fff;
box-shadow:0 2px 8px rgba(15,23,42,.035)
}
.region-trend-title{
margin-bottom:4px;
color:#234f54;
font-size:15px;
font-weight:950;
line-height:1.4
}
.region-trend-subtitle{
margin-bottom:15px;
color:#60777b;
font-size:11px;
font-weight:650;
line-height:1.5
}
.region-trend-chart-wrap{
position:relative;
width:100%;
height:390px;
overflow-x:auto;
overflow-y:hidden;
border:1px solid #dce6e8;
border-radius:10px;
background:
linear-gradient(
180deg,
#ffffff 0%,
#fbfdfd 100%
)
}
.region-trend-chart{
position:relative;
width:100%;
min-width:850px;
height:100%;
background:transparent
}
.region-trend-svg{
display:block;
width:100%;
height:100%;
overflow:visible
}
.region-trend-grid-line{
stroke:#dfe7e9;
stroke-width:1;
stroke-dasharray:3 5;
opacity:.9
}
.region-trend-zone-label{
fill:#3A6F75;
font-size:11px;
font-weight:900;
letter-spacing:.4px
}
.region-trend-zone-separator{
stroke:#9aafb3;
stroke-width:1.4;
stroke-dasharray:5 4;
opacity:.9
}
.region-trend-vertical-grid-line{
stroke:#e4ebec;
stroke-width:1;
stroke-dasharray:2 4;
opacity:.8
}

.region-trend-bar{
fill:#3A6F75;
opacity:.88;
cursor:pointer;
transition:opacity .15s ease, filter .15s ease
}
.region-trend-bar:hover{
opacity:1;
filter:brightness(.92)
}
.region-trend-bar-value{
fill:#3A6F75;
font-size:11px;
font-weight:700;
pointer-events:none
}
.region-trend-axis-line{
stroke:#9aafb3;
stroke-width:1.2
}
.region-trend-axis-label{
fill:#526a6e;
font-size:10px;
font-weight:750
}
.region-trend-point{
stroke:#fff;
stroke-width:2.5;
cursor:pointer;
transition:
r .18s ease,
stroke-width .18s ease,
filter .18s ease
}
.region-trend-point:hover{
r:7;
stroke-width:3;
filter:
drop-shadow(
0 2px 4px
rgba(15,23,42,.22)
)
}
.region-trend-area{
opacity:.055;
pointer-events:none
}
.region-trend-line{
fill:none;
stroke-width:3;
stroke-linecap:round;
stroke-linejoin:round;
vector-effect:non-scaling-stroke
}
.region-trend-tooltip{
position:absolute;
z-index:20;
display:none;
min-width:165px;
max-width:230px;
padding:10px 12px;
border:1px solid #c5d8da;
border-radius:8px;
background:#fff;
box-shadow:
0 6px 20px rgba(15,23,42,.14);
pointer-events:none;
color:#17383c;
font-size:11px;
font-weight:750;
line-height:1.5
}
.region-trend-tooltip-title{
margin-bottom:3px;
color:#3A6F75;
font-size:12px;
font-weight:950
}
.region-trend-tooltip-value{
color:#405c60;
font-size:11px;
font-weight:800
}
.region-trend-legend{
display:flex;
flex-wrap:wrap;
align-items:center;
gap:10px 20px;
margin-top:14px;
padding-top:12px;
border-top:1px solid #e1e9ea
}
.region-trend-legend-item{
display:flex;
align-items:center;
gap:7px;
color:#4c6569;
font-size:11px;
font-weight:800
}
.region-trend-legend-line{
position:relative;
width:27px;
height:3px;
border-radius:4px
}
.region-trend-legend-line::after{
content:"";
position:absolute;
left:50%;
top:50%;
width:7px;
height:7px;
transform:translate(-50%,-50%);
border:1.5px solid #fff;
border-radius:50%;
background:inherit
}
.region-trend-empty{
display:flex;
align-items:center;
justify-content:center;
height:280px;
color:#60777b;
font-size:12px;
font-weight:700
}
@media(max-width:850px){
.region-trend-chart-wrap{
height:350px
}
.region-trend-chart{
min-width:750px
}
.region-trend-title{
font-size:14px
}
.region-trend-subtitle{
font-size:10px
}
}

/* =========================================================
   ZONE WISE TREND GRAPH
   ========================================================= */
.zone-trend-card{
width:100%;
margin-top:18px;
padding:18px;
border:1px solid #d5e1e3;
border-radius:12px;
background:#fff;
box-shadow:0 2px 8px rgba(15,23,42,.035)
}
.zone-trend-title{
margin-bottom:4px;
color:#234f54;
font-size:15px;
font-weight:950;
line-height:1.4
}
.zone-trend-subtitle{
margin-bottom:15px;
color:#60777b;
font-size:11px;
font-weight:650;
line-height:1.5
}
.zone-trend-chart-wrap{
position:relative;
width:100%;
height:390px;
overflow-x:auto;
overflow-y:hidden;
border:1px solid #dce6e8;
border-radius:10px;
background:
linear-gradient(
180deg,
#ffffff 0%,
#fbfdfd 100%
)
}
.zone-trend-chart{
position:relative;
width:100%;
min-width:850px;
height:100%;
background:transparent
}
.zone-trend-svg{
display:block;
width:100%;
height:100%;
overflow:visible
}
.zone-trend-grid-line{
stroke:#dfe7e9;
stroke-width:1;
stroke-dasharray:3 5;
opacity:.9
}
.zone-trend-axis-line{
stroke:#9aafb3;
stroke-width:1.2
}
.zone-trend-axis-label{
fill:#526a6e;
font-size:10px;
font-weight:750
}
.zone-trend-point{
stroke:#fff;
stroke-width:2.5;
cursor:pointer;
transition:
r .18s ease,
stroke-width .18s ease,
filter .18s ease
}
.zone-trend-point:hover{
r:7;
stroke-width:3;
filter:
drop-shadow(
0 2px 4px
rgba(15,23,42,.22)
)
}
.zone-trend-area{
opacity:.055;
pointer-events:none
}
.zone-trend-line{
fill:none;
stroke-width:3;
stroke-linecap:round;
stroke-linejoin:round;
vector-effect:non-scaling-stroke
}
.zone-trend-tooltip{
position:absolute;
z-index:20;
display:none;
min-width:165px;
max-width:230px;
padding:10px 12px;
border:1px solid #c5d8da;
border-radius:8px;
background:#fff;
box-shadow:
0 6px 20px rgba(15,23,42,.14);
pointer-events:none;
color:#17383c;
font-size:11px;
font-weight:750;
line-height:1.5
}
.zone-trend-tooltip-title{
margin-bottom:3px;
color:#3A6F75;
font-size:12px;
font-weight:950
}
.zone-trend-tooltip-value{
color:#405c60;
font-size:11px;
font-weight:800
}
.zone-trend-legend{
display:flex;
flex-wrap:wrap;
align-items:center;
gap:10px 20px;
margin-top:14px;
padding-top:12px;
border-top:1px solid #e1e9ea
}
.zone-trend-legend-item{
display:flex;
align-items:center;
gap:7px;
color:#4c6569;
font-size:11px;
font-weight:800
}
.zone-trend-legend-line{
position:relative;
width:27px;
height:3px;
border-radius:4px
}
.zone-trend-legend-line::after{
content:"";
position:absolute;
left:50%;
top:50%;
width:7px;
height:7px;
transform:translate(-50%,-50%);
border:1.5px solid #fff;
border-radius:50%;
background:inherit
}
.zone-trend-empty{
display:flex;
align-items:center;
justify-content:center;
height:280px;
color:#60777b;
font-size:12px;
font-weight:700
}
@media(max-width:850px){
.zone-trend-chart-wrap{
height:350px
}
.zone-trend-chart{
min-width:750px
}
.zone-trend-title{
font-size:14px
}
.zone-trend-subtitle{
font-size:10px
}
}
.zone-wise-footer{
margin-top:8px;
color:var(--text-light);
font-size:10px;
font-weight:650
}

/* =========================================================
   ZONE WISE - INDEPENDENT FY / MONTH CONTROLS
   ========================================================= */

.zone-wise-filter-bar{
    width:100%;
    display:flex;
    align-items:center;
    gap:20px;
    margin-bottom:20px;
    padding:0;
}

.zone-wise-fy-container{
    flex-shrink:0;
}

.zone-wise-fy-field{
    position:relative;
    width:155px;
    min-width:155px;
    height:38px;
    display:flex;
    align-items:center;
    border:1px solid var(--teal-border);
    border-radius:8px;
    background:#fff;
    overflow:visible;
}

.zone-wise-fy-label{
    position:absolute;
    z-index:3;
    top:-6px;
    left:10px;
    padding:0 5px;
    background:#fff;
    color:var(--teal-dark);
    font-size:12px;
    font-weight:900;
    line-height:14px;
    letter-spacing:.4px;
    pointer-events:none;
}

.zone-wise-fy-select{
    width:100%;
    height:36px;
    padding:5px 10px;
    border:0;
    border-radius:8px;
    outline:none;
    background:#fff;
    color:var(--text-dark);
    font-size:12px;
    font-weight:850;
    cursor:pointer;
    appearance:auto;
}

.zone-wise-fy-select:hover{
    border:0;
}

.zone-wise-fy-select:focus{
    border:0;
    outline:none;
    box-shadow:none;
}

.zone-wise-fy-field:hover{
    border-color:var(--teal-light);
}

.zone-wise-months-scroll{
    flex:1;
    display:flex;
    align-items:center;
    gap:8px;
    overflow-x:auto;
    scrollbar-width:none;
    padding:2px 0;
}

.zone-wise-months-scroll::-webkit-scrollbar{
    display:none;
}

.zone-month-pill{
    flex-shrink:0;
    min-width:52px;
    height:34px;
    padding:0 13px;
    border:1px solid #d8e2e4;
    border-radius:18px;
    background:#fff;
    color:#3A6F75;
    display:flex;
    align-items:center;
    justify-content:center;
    font-size:12px;
    font-weight:600;
    cursor:pointer;
    transition:all .2s ease;
}

.zone-month-pill:hover{
    border-color:#6AA0A4;
}

.zone-month-pill.active{
    background:
    linear-gradient(
        135deg,
        #3A6F75 0%,
        #6AA0A4 100%
    );
    color:#fff;
    border-color:#3A6F75;
    box-shadow:
    0 2px 5px rgba(58,111,117,.14),
    inset 0 1px 1px rgba(255,255,255,.20);
}

.com-wise-panel{
display:block;
min-height:500px
}

/* =========================================================
   COM WISE - INDEPENDENT FY / MONTH CONTROLS
   ========================================================= */

.com-wise-filter-bar{
    width:100%;
    display:flex;
    align-items:center;
    gap:20px;
    margin-bottom:20px;
    padding:0;
}

.com-wise-fy-container{
    flex-shrink:0;
}

.com-wise-fy-field{
    position:relative;
    width:155px;
    min-width:155px;
    height:38px;
    display:flex;
    align-items:center;
    border:1px solid var(--teal-border);
    border-radius:8px;
    background:#fff;
    overflow:visible;
}

.com-wise-fy-label{
    position:absolute;
    z-index:3;
    top:-6px;
    left:10px;
    padding:0 5px;
    background:#fff;
    color:var(--teal-dark);
    font-size:12px;
    font-weight:900;
    line-height:14px;
    letter-spacing:.4px;
    pointer-events:none;
}

.com-wise-fy-select{
    width:100%;
    height:36px;
    padding:5px 10px;
    border:0;
    border-radius:8px;
    outline:none;
    background:#fff;
    color:var(--text-dark);
    font-size:12px;
    font-weight:850;
    cursor:pointer;
    appearance:auto;
}

.com-wise-fy-select:hover{
    border:0;
}

.com-wise-fy-select:focus{
    border:0;
    outline:none;
    box-shadow:none;
}

.com-wise-fy-field:hover{
    border-color:var(--teal-light);
}

.com-wise-months-scroll{
    flex:1;
    display:flex;
    align-items:center;
    gap:8px;
    overflow-x:auto;
    scrollbar-width:none;
    padding:2px 0;
}

.com-wise-months-scroll::-webkit-scrollbar{
    display:none;
}

.com-month-pill{
    flex-shrink:0;
    min-width:52px;
    height:34px;
    padding:0 13px;
    border:1px solid #d8e2e4;
    border-radius:18px;
    background:#fff;
    color:#3A6F75;
    display:flex;
    align-items:center;
    justify-content:center;
    font-size:12px;
    font-weight:600;
    cursor:pointer;
    transition:all .2s ease;
}

.com-month-pill:hover{
    border-color:#6AA0A4;
}

.com-month-pill.active{
    background:
    linear-gradient(
        135deg,
        #3A6F75 0%,
        #6AA0A4 100%
    );
    color:#fff;
    border-color:#3A6F75;
    box-shadow:
    0 2px 5px rgba(58,111,117,.14),
    inset 0 1px 1px rgba(255,255,255,.20);
}

.com-wise-table-wrapper{
    width:100%;
    overflow-x:auto;
    margin-top:20px;
}

.com-wise-table{
    width:100%;
    border-collapse:collapse;
    background:#ffffff;
    border:1px solid #d9e4e5;
    border-radius:8px;
    overflow:hidden;
}

.com-wise-table th{
    background:#3A6F75;
    color:#ffffff;
    font-size:13px;
    font-weight:600;
    padding:11px 12px;
    text-align:center;
    border:1px solid #d9e4e5;
    white-space:nowrap;
}

.com-wise-table td{
    padding:10px 12px;
    font-size:13px;
    color:#333333;
    border:1px solid #d9e4e5;
    text-align:center;
}

.com-wise-table td.com-zone{
    text-align:left;
    font-weight:600;
    color:#3A6F75;
}

.com-wise-table td.com-name{
    text-align:left;
    font-weight:500;
}

.com-wise-table .zone-total-row{
    background:#f3f7f7;
    font-weight:600;
}

.com-wise-table .zone-total-row td{
    font-weight:600;
    color:#3A6F75;
}

.com-wise-table .grand-total-row{
    background:#e8f0f1;
    font-weight:700;
}

.com-wise-table .grand-total-row td{
    font-weight:700;
    color:#3A6F75;
}

.com-wise-title{
    font-size:18px;
    font-weight:600;
    color:#3A6F75;
    margin-bottom:8px;
}

.com-wise-subtitle{
    font-size:13px;
    color:#6b7280;
    margin-bottom:15px;
}

.com-wise-loading{
    padding:40px;
    text-align:center;
    color:#6b7280;
}

.com-wise-empty{
    padding:40px;
    text-align:center;
    color:#6b7280;
    border:1px solid #d9e4e5;
    border-radius:8px;
}

/* =========================================================
   REGION WISE - POWER BI STYLE UI
   ========================================================= */

.region-wise-dashboard{
    width:100%;
    margin-top:12px;
}

.region-wise-heading{
    display:flex;
    align-items:center;
    justify-content:space-between;
    margin-bottom:16px;
}

.region-wise-title{
    font-size:18px;
    font-weight:700;
    color:#315f65;
    letter-spacing:.2px;
}

.region-wise-subtitle{
    margin-top:4px;
    font-size:12px;
    color:#7b8588;
}

/* =========================================================
   KPI CARDS
   ========================================================= */

.region-wise-kpi-grid{
    display:grid;
    grid-template-columns:
        repeat(4, minmax(0, 1fr));
    gap:12px;
    margin-bottom:18px;
}

.region-wise-kpi-card{
    background:#ffffff;
    border:1px solid #e2e8e9;
    border-radius:10px;
    padding:15px 17px;
    min-height:82px;
    box-shadow:
        0 2px 8px rgba(42,70,74,.06);
    transition:
        transform .15s ease,
        box-shadow .15s ease;
}

.region-wise-kpi-card:hover{
    transform:translateY(-1px);
    box-shadow:
        0 5px 14px rgba(42,70,74,.10);
}

.region-wise-kpi-label{
    font-size:11px;
    font-weight:600;
    color:#7a8588;
    text-transform:uppercase;
    letter-spacing:.6px;
    margin-bottom:7px;
}

.region-wise-kpi-value{
    font-size:24px;
    line-height:1.1;
    font-weight:700;
    color:#315f65;
}

.region-wise-kpi-value.bhsc-change-up{
    color:#2f7d4a;
}

.region-wise-kpi-value.bhsc-change-down{
    color:#c45555;
}

.region-wise-kpi-value.bhsc-change-neutral{
    color:#7a8588;
}

.bhsc-change-icon{
    display:inline-block;
    margin-right:4px;
    font-size:18px;
    font-weight:900;
    line-height:1;
    color:#26383b;
    vertical-align:-1px;
}

/* =========================================================
   TABLE CONTAINER
   ========================================================= */

.region-wise-table-wrapper{
    width:100%;
    overflow:visible;
    max-height:none;
    border:1px solid #dfe7e8;
    border-radius:10px;
    background:#ffffff;
    box-shadow:
        0 2px 10px rgba(42,70,74,.05);
}

/* =========================================================
   POWER BI STYLE MATRIX
   ========================================================= */

.region-wise-power-table{
    width:100%;
    min-width:850px;
    border-collapse:separate;
    border-spacing:0;
    font-size:13px;
}

.region-wise-power-table thead th{
    position:sticky;
    top:0;
    z-index:5;
    background:#3a6f75;
    color:#ffffff;
    font-size:11px;
    font-weight:700;
    text-transform:uppercase;
    letter-spacing:.45px;
    padding:12px 14px;
    border-right:1px solid rgba(255,255,255,.14);
    border-bottom:1px solid #315f65;
    white-space:nowrap;
}

.region-wise-power-table thead th:first-child{
    border-top-left-radius:8px;
}

.region-wise-power-table thead th:last-child{
    border-top-right-radius:8px;
}

/* =========================================================
   NORMAL COM ROW
   ========================================================= */

.region-wise-power-table tbody td{
    padding:10px 14px;
    border-bottom:1px solid #edf1f2;
    color:#35484b;
    background:#ffffff;
    vertical-align:middle;
}

/* =========================================================
   HIERARCHY GUIDE LINES
   ========================================================= */

/* Zone level vertical guide */
.region-wise-power-table tbody
.hierarchy-region-row td:first-child,
.region-wise-power-table tbody
.hierarchy-com-row td:first-child,
.region-wise-power-table tbody
.hierarchy-region-total-row td:first-child{
    position:relative;
}

.region-wise-power-table tbody
.hierarchy-region-row td:first-child::after,
.region-wise-power-table tbody
.hierarchy-com-row td:first-child::after,
.region-wise-power-table tbody
.hierarchy-region-total-row td:first-child::after{
    content:"";
    position:absolute;
    top:0;
    bottom:0;
    right:16px;
    width:2px;
    background:#687477;
}

/* Region level vertical guide */
.region-wise-power-table tbody
.hierarchy-com-row td:nth-child(2),
.region-wise-power-table tbody
.hierarchy-region-total-row td:nth-child(2){
    position:relative;
}

.region-wise-power-table tbody
.hierarchy-com-row td:nth-child(2)::after,
.region-wise-power-table tbody
.hierarchy-region-total-row td:nth-child(2)::after{
    content:"";
    position:absolute;
    top:0;
    bottom:0;
    left:20px;
    width:2px;
    background:#687477;
}

/* Horizontal connection from hierarchy line to Region */
.region-wise-power-table tbody
.hierarchy-region-row td:nth-child(2){
    position:relative;
}

.region-wise-power-table tbody
.hierarchy-region-row td:nth-child(2)::before{
    content:"";
    position:absolute;
    left:0;
    top:50%;
    width:20px;
    height:2px;
    background:#687477;
}

/* Horizontal connection from hierarchy line to COM */
.region-wise-power-table tbody
.hierarchy-com-row td:nth-child(3){
    position:relative;
}

.region-wise-power-table tbody
.hierarchy-com-row td:nth-child(3)::before{
    content:"";
    position:absolute;
    left:0;
    top:50%;
    width:20px;
    height:2px;
    background:#687477;
}


/* =========================================================
   REGION-SPECIFIC COLOR THEMES
   ========================================================= */

.region-wise-power-table tbody tr.hierarchy-region-row td{
    background:#f8fafb !important;
}

.region-wise-power-table tbody tr.hierarchy-com-row td{
    background:#ffffff !important;
}

.region-wise-power-table tbody tr.hierarchy-region-total-row td{
    background:#ffffff !important;
}

.region-wise-power-table tbody tr.hierarchy-com-row:hover td{
    background:#f5f9f9;
}

.hierarchy-column{
    width:150px;
}

.com-column{
    min-width:220px;
}

.score-column{
    width:130px;
    text-align:center;
}

.change-column{
    width:100px;
    text-align:center;
}

/* =========================================================
   ZONE HEADER
   ========================================================= */

.hierarchy-zone-row td{
    background:#e8f3f3 !important;
    border-top:2px solid #c5dadd !important;
    border-bottom:1px solid #c5dadd !important;
    padding:0 !important;
}

.hierarchy-zone-row:hover td{
    background:#e2efef !important;
}

.hierarchy-toggle{
    width:100%;
    border:0;
    background:transparent;
    cursor:pointer;
    display:flex;
    align-items:center;
    gap:9px;
    text-align:left;
    font-family:inherit;
}

.zone-toggle{
    padding:11px 14px;
}

.hierarchy-arrow{
    width:14px;
    min-width:14px;
    font-size:11px;
    color:#3a6f75;
    transition:transform .15s ease;
}

.hierarchy-zone-name{
    color:#315f65 !important;
    font-size:13px;
    font-weight:700;
    letter-spacing:.3px;
}

/* =========================================================
   REGION HEADER
   ========================================================= */

.hierarchy-region-row td{
    background:#f0f5f8 !important;
    border-top:1px solid #d7e3e7 !important;
    border-bottom:1px solid #dce7e9 !important;
    padding-top:0 !important;
    padding-bottom:0 !important;
}

.region-toggle{
    padding:9px 14px;
    padding-left:20px;
}

.hierarchy-region-name{
    color:#405f68 !important;
    font-size:12px;
    font-weight:700;
}

.hierarchy-region-row:hover td{
    background:#eaf2f5 !important;
}

/* =========================================================
   COM
   ========================================================= */

.hierarchy-com-row td:first-child,
.hierarchy-com-row td:nth-child(2){
    background:#ffffff !important;
    border-bottom:1px solid #edf1f2 !important;
}

.com-name{
    font-weight:500;
    color:#405052 !important;
    padding-left:34px !important;
    border-left:3px solid #eef3f4;
}

.bhsc-score-cell{
    text-align:center;
    border-left:1px solid #e1e9ea;
    background:#fcfdfd;
}

.bhsc-score{
    display:inline-block;
    min-width:58px;
    font-weight:600;
    font-variant-numeric:tabular-nums;
}

/* =========================================================
   CHANGE
   ========================================================= */

.bhsc-change-cell{
    text-align:center;
    white-space:nowrap;
    font-size:12px;
    font-weight:700;
    border-left:1px solid #e1e9ea;
    background:#fafcfc;
}

.bhsc-change-up{
    color:#2f7d4a;
}

.bhsc-change-down{
    color:#c45555;
}

.bhsc-change-neutral{
    color:#7a8588;
}

/* =========================================================
   REGION TOTAL
   ========================================================= */

.hierarchy-region-total-row td{
    background:#eeeeee !important;
    color:#3f4a4d !important;
    font-weight:600;
    border-top:1px solid #c8c8c8 !important;
    border-bottom:2px solid #b8b8b8 !important;
}

.hierarchy-region-total-row td:nth-child(2){
    padding-left:28px;
}

/* =========================================================
   ZONE TOTAL
   ========================================================= */

.hierarchy-zone-total-row td{
    background:#eaf4f4 !important;
    color:#315f65 !important;
    font-weight:700;
    border-top:2px solid #c9dddd !important;
    border-bottom:2px solid #c9dddd !important;
}

.hierarchy-zone-total-row td:first-child{
    padding-left:14px;
}

/* =========================================================
   GRAND TOTAL
   ========================================================= */

.hierarchy-grand-total-row td{
    position:sticky;
    bottom:0;
    z-index:4;
    background:#315f65 !important;
    color:#ffffff !important;
    font-weight:700;
    font-size:13px;
    padding-top:13px !important;
    padding-bottom:13px !important;
    border-bottom:0 !important;
}

.hierarchy-grand-total-row td:first-child{
    border-bottom-left-radius:8px;
}

.hierarchy-grand-total-row td:last-child{
    border-bottom-right-radius:8px;
}

/* =========================================================
   RESPONSIVE
   ========================================================= */

@media (max-width:900px){

    .region-wise-kpi-grid{
        grid-template-columns:
            repeat(2, minmax(0, 1fr));
    }

}

@media (max-width:600px){

    .region-wise-kpi-grid{
        grid-template-columns:
            1fr;
    }

    .region-wise-title{
        font-size:16px;
    }

    .region-wise-table-wrapper{
        max-height:none;
        overflow:visible;
    }

}

.view-coming-soon{
padding:30px 40px;
border:1px solid var(--border);
border-radius:12px;
background:#fff;
box-shadow:0 2px 8px rgba(15,23,42,.035);
text-align:center;
color:var(--text-muted);
font-size:14px;
font-weight:600
}
.view-coming-soon-title{
margin-bottom:6px;
color:var(--teal-dark);
font-size:18px;
font-weight:800
}
@media(max-width:1250px){
.month-pill{
padding:8px 11px;
min-width:46px
}
.combined-score-title{
font-size:18px
}
.combined-score-meta{
font-size:11px
}
.combined-grade-score{
font-size:16px
}
}
@media(max-width:1100px){
.scorecard-sidebar{
width:285px;
min-width:285px
}
.scorecard-main{
padding-left:14px
}
.fy-container{
width:145px;
min-width:145px
}
.month-pill{
padding:8px 9px;
min-width:43px;
font-size:11px
}
.score-breakdown-bars{
gap:4px;
padding:0 6px
}
.score-breakdown-bar-group{
min-width:70px
}
.score-breakdown-bar{
max-width:32px
}
.combined-main-row{
gap:16px
}
.combined-score-header{
flex-basis:32%;
min-width:250px;
padding-right:16px
}
.combined-score-title{
font-size:17px
}
.combined-score-meta{
font-size:10px
}
.combined-grade-score-row{
margin-top:7px
}
.combined-grade-score{
font-size:15px
}
.combined-score-icon{
width:28px;
height:28px;
min-width:28px;
font-size:14px
}
.combined-info-row{
padding-left:8px;
padding-right:8px
}
.combined-info-row:nth-child(3n+1){
padding-left:0!important
}
.combined-info-row:nth-child(3n){
padding-right:0!important;
border-right:none
}
.combined-info-label{
font-size:10px
}
.combined-info-val{
font-size:11px
}
.scorecard-view-tab{
min-width:115px;
padding-left:15px;
padding-right:15px
}
}
@media(max-width:850px){
html,
body{
overflow:auto!important;
height:auto!important
}
.layout-main-section,
.layout-main-section-wrapper,
.page-container{
overflow:visible!important;
height:auto!important
}
.branch-scorecard-page{
height:auto!important;
min-height:calc(100vh - 85px);
overflow:visible!important;
padding-bottom:30px
}
.scorecard-layout{
height:auto!important;
flex-direction:column;
overflow:visible!important
}
.scorecard-sidebar{
position:relative;
top:auto;
width:100%;
min-width:100%;
height:300px;
min-height:300px;
max-height:300px;
padding:2px 2px 10px;
border-right:none;
border-bottom:2px solid var(--teal-dark);
background:#fff
}
.scorecard-main{
width:100%;
height:auto!important;
min-height:0;
padding-left:0;
overflow:visible!important;
background:#fff
}
.dashboard-top-nav{
height:auto;
min-height:54px;
justify-content:flex-start;
flex-wrap:nowrap;
background:#fff
}
.fy-container{
width:125px;
min-width:125px
}
.months-scroll{
flex:1;
justify-content:flex-start;
padding-left:8px;
background:#fff
}
.scorecard-content{
height:auto!important;
overflow:visible!important;
background:#fff
}
#scorecard-details{
height:auto!important;
overflow:visible!important;
background:#fff
}
.functions-grid-right{
grid-template-columns:1fr
}
.function-card{
height:auto;
min-height:0
}
.combined-branch-score-card{
height:auto;
min-height:0
}
.combined-main-row{
height:auto;
flex-direction:column;
gap:14px
}
.combined-score-header{
flex:none;
width:100%;
min-width:0;
padding-right:18px;
padding-bottom:16px;
border-right:none;
border-bottom:1px solid var(--border-light)
}
.combined-score-title{
font-size:20px;
margin-bottom:7px
}
.combined-score-meta{
font-size:11px
}
.combined-grade-score-row{
margin-top:8px
}
.combined-grade-score{
font-size:17px
}
.combined-branch-details{
width:100%;
padding:0 14px 14px;
background:#fff
}
.combined-info-list{
display:grid;
grid-template-columns:repeat(2,minmax(0,1fr));
background:#fff
}
.combined-info-row{
min-width:0;
padding:9px 12px;
border-right:1px solid var(--border-light);
border-bottom:1px solid var(--border-light)
}
.combined-info-row:nth-child(2n+1){
padding-left:0!important
}
.combined-info-row:nth-child(2n){
padding-right:0!important;
border-right:none
}
.combined-info-row:nth-last-child(-n+2){
border-bottom:none
}
.score-breakdown-chart{
height:275px
}
.score-breakdown-ruler{
height:210px
}
.score-breakdown-bars{
padding:0 3px
}
.score-breakdown-bar-group{
min-width:52px
}
.score-breakdown-bar{
max-width:24px
}
.score-breakdown-bar-label{
width:90px;
font-size:9px
}
.score-breakdown-bar-value{
font-size:12px
}
.scorecard-view-tabs{
height:54px;
min-height:54px;
overflow-x:auto;
overflow-y:hidden;
justify-content:flex-start;
gap:6px;
padding:5px 6px;
border-radius:9px
}
.scorecard-view-tab{
height:40px;
min-width:105px;
padding:8px 14px;
font-size:12px
}
.scorecard-view-container{
height:auto!important;
min-height:500px;
overflow:visible!important
}
.zone-wise-header{
padding:12px
}
.zone-wise-title{
font-size:14px
}
.zone-wise-table{
min-width:700px
}
.zone-wise-table th,
.zone-wise-table td{
padding:9px 8px;
font-size:10px
}
.zone-wise-table th:first-child{
min-width:145px
}
}
/* =========================================================
   ZONE WISE TREND COMPARISON
   ========================================================= */
.zone-comparison-card{
margin-top:22px;
background:#fff;
border:1px solid #d7e3e5;
border-radius:12px;
overflow:hidden;
box-shadow:0 3px 12px rgba(42,78,82,.06)
}
.zone-comparison-header{
display:flex;
align-items:center;
justify-content:space-between;
gap:15px;
padding:18px 20px;
border-bottom:1px solid #e1eaeb;
background:linear-gradient(
135deg,
#f7fbfb 0%,
#eef6f7 100%
)
}
.zone-comparison-title{
font-size:17px;
font-weight:800;
color:#315d62;
letter-spacing:.1px
}
.zone-comparison-subtitle{
margin-top:5px;
font-size:12px;
color:#718487;
line-height:1.5
}
.zone-comparison-period{
flex-shrink:0;
padding:7px 12px;
border-radius:20px;
background:#e2f0f1;
border:1px solid #c7dfe1;
color:#3a6f75;
font-size:11px;
font-weight:800;
white-space:nowrap
}
.zone-comparison-table-wrap{
width:100%;
overflow-x:auto
}
.zone-comparison-table{
width:100%;
min-width:680px;
border-collapse:collapse;
font-size:13px
}
.zone-comparison-table th{
padding:12px 14px;
background:#f5f9fa;
border-bottom:1px solid #d8e4e5;
color:#45666a;
font-size:11px;
font-weight:800;
text-transform:uppercase;
letter-spacing:.4px;
text-align:center;
white-space:nowrap
}
.zone-comparison-table th:first-child{
text-align:left;
position:sticky;
left:0;
z-index:3;
background:#f5f9fa
}
.zone-comparison-table td{
padding:12px 14px;
border-bottom:1px solid #edf2f3;
text-align:center;
color:#40575a;
background:#fff
}
.zone-comparison-table td:first-child{
text-align:left;
position:sticky;
left:0;
z-index:2;
background:#fff;
font-weight:750;
color:#365c61
}
.zone-comparison-table tbody tr:hover td{
background:#f8fbfb
}
.zone-comparison-zone-name{
display:flex;
align-items:center;
gap:8px
}
.zone-comparison-zone-dot{
width:7px;
height:7px;
border-radius:50%;
background:#4f8f8f;
flex-shrink:0
}
.zone-comparison-value{
display:inline-flex;
align-items:center;
justify-content:center;
min-width:48px;
height:28px;
padding:0 9px;
border-radius:7px;
font-weight:800;
font-size:12px
}
.zone-comparison-constant{
background:#eef2f3;
color:#586b6e
}
.zone-comparison-down{
background:#fff0f0;
color:#b45353
}
.zone-comparison-up{
background:#edf8f1;
color:#42805a
}
.zone-comparison-total{
background:#edf5f6;
color:#3a6f75
}
.zone-comparison-table .grand-total-row td{
background:#f1f7f8;
border-top:2px solid #c9dcde;
border-bottom:none;
font-weight:850
}
.zone-comparison-table .grand-total-row td:first-child{
background:#f1f7f8;
color:#315d62
}
.zone-comparison-legend{
display:flex;
flex-wrap:wrap;
gap:18px;
padding:13px 18px;
border-top:1px solid #edf2f3;
background:#fbfcfc
}
.zone-comparison-legend-item{
display:flex;
align-items:center;
gap:7px;
font-size:11px;
color:#718184
}
.zone-comparison-legend-dot{
width:8px;
height:8px;
border-radius:50%
}
.zone-comparison-empty{
padding:28px 20px;
text-align:center;
color:#77888a;
font-size:13px
}
.zone-comparison-empty-title{
margin-bottom:5px;
color:#49686c;
font-weight:800
}
@media(max-width:768px){
.zone-comparison-header{
align-items:flex-start;
flex-direction:column
}
.zone-comparison-period{
align-self:flex-start
}
.zone-comparison-table{
min-width:620px
}
}
`)
.appendTo("head");
let page=frappe.ui.make_app_page({
parent:wrapper,
title:"Branch Score Card",
single_column:true
});
let months_list=[
"April",
"May",
"June",
"July",
"August",
"September",
"October",
"November",
"December",
"January",
"February",
"March"
];
let month_short_names={
January:"Jan",
February:"Feb",
March:"Mar",
April:"Apr",
May:"May",
June:"Jun",
July:"Jul",
August:"Aug",
September:"Sep",
October:"Oct",
November:"Nov",
December:"Dec"
};
function get_current_calendar_month_name(){
let calendar_months=[
"January",
"February",
"March",
"April",
"May",
"June",
"July",
"August",
"September",
"October",
"November",
"December"
];
return calendar_months[new Date().getMonth()];
}
function get_current_financial_year(){
let now=new Date();
let calendar_month=now.getMonth();
let calendar_year=now.getFullYear();

if(calendar_month>=3){
return `${calendar_year}-${calendar_year+1}`;
}

return `${calendar_year-1}-${calendar_year}`;
}

function generate_financial_year_options(
    start_year=2020
){
let current_fy=
    get_current_financial_year();

let current_start_year=
    parseInt(
        String(current_fy).split("-")[0],
        10
    );

let options="";

for(
    let year=start_year;
    year<=current_start_year+1;
    year++
){
    let fy=
        `${year}-${year+1}`;

    let selected=
        fy===current_fy
        ?"selected"
        :"";

    options+=`
        <option
            value="${fy}"
            ${selected}>
            ${year}–${year+1}
        </option>
    `;
}

return options;
}

function get_visible_months_for_fy(selected_fy){
let current_fy=get_current_financial_year();
let selected_start_year=parseInt(
String(selected_fy||"").split("-")[0],
10
);
let current_start_year=parseInt(
String(current_fy).split("-")[0],
10
);
if(
Number.isNaN(selected_start_year)||
Number.isNaN(current_start_year)
){
return months_list;
}
if(selected_start_year<current_start_year){
return months_list;
}
if(selected_start_year>current_start_year){
return [];
}
let current_month_name=
get_current_calendar_month_name();
let current_month_index=
months_list.indexOf(current_month_name);
if(current_month_index<0){
return months_list;
}
return months_list.slice(
0,
current_month_index+1
);
}
function render_month_capsules(
selected_fy,
requested_active_month
){
let visible_months=
get_visible_months_for_fy(selected_fy);
let active_month=
visible_months.includes(requested_active_month)
?requested_active_month
:visible_months.length
?visible_months[visible_months.length-1]
:null;
let months_html=
visible_months.map(month=>`
<div
class="month-pill ${month===active_month?"active":""}"
data-month="${frappe.utils.escape_html(month)}">
${month_short_names[month]}
</div>
`).join("");
$(".months-scroll").html(months_html);
return active_month;
}

/* =========================================================
   ZONE WISE - INDEPENDENT FY / MONTH CONTROLS
   ========================================================= */

function get_zone_selected_fy(){

    return String(
        $("#zone-wise-fy").val() || ""
    ).trim();

}


function get_zone_selected_month(){

    return String(
        $("#zone-wise-months .zone-month-pill.active")
            .attr("data-month") || ""
    ).trim();

}


function render_month_capsules_for(
    container_selector,
    pill_class,
    selected_fy,
    requested_active_month
){

    let visible_months =
        get_visible_months_for_fy(
            selected_fy
        );

    let active_month =
        visible_months.includes(
            requested_active_month
        )
        ? requested_active_month
        : (
            visible_months.length
            ? visible_months[
                visible_months.length - 1
            ]
            : null
        );

    let months_html =
        visible_months.map(function(month){

            return `
                <div
                    class="${pill_class} ${
                        month === active_month
                        ? "active"
                        : ""
                    }"
                    data-month="${frappe.utils.escape_html(
                        month
                    )}">
                    ${month_short_names[month]}
                </div>
            `;

        }).join("");

    $(container_selector).html(
        months_html
    );

    return active_month;

}


function render_zone_month_capsules(
    selected_fy,
    requested_active_month
){

    return render_month_capsules_for(
        "#zone-wise-months",
        "zone-month-pill",
        selected_fy,
        requested_active_month
    );

}


function initialize_zone_wise_filters(){

    let current_fy =
        get_current_financial_year();

    let current_month =
        get_current_calendar_month_name();

    $("#zone-wise-fy").val(
        current_fy
    );

    let active_month =
        render_zone_month_capsules(
            current_fy,
            current_month
        );

    return {
        fy: current_fy,
        month: active_month
    };

}

/* =========================================================
   COM WISE - INDEPENDENT FY / MONTH CONTROLS
   ========================================================= */

function get_com_selected_fy(){

    return String(
        $("#com-wise-fy").val() || ""
    ).trim();

}


function get_com_selected_month(){

    return String(
        $("#com-wise-months .com-month-pill.active")
            .attr("data-month") || ""
    ).trim();

}


function render_com_month_capsules(
    selected_fy,
    requested_active_month
){

    return render_month_capsules_for(
        "#com-wise-months",
        "com-month-pill",
        selected_fy,
        requested_active_month
    );

}


function initialize_com_wise_filters(){

    let current_fy =
        get_current_financial_year();

    let current_month =
        get_current_calendar_month_name();

    $("#com-wise-fy").val(
        current_fy
    );

    let active_month =
        render_com_month_capsules(
            current_fy,
            current_month
        );

    return {
        fy: current_fy,
        month: active_month
    };

}

let initial_fy=get_current_financial_year();
let initial_visible_months=
get_visible_months_for_fy(initial_fy);
let initial_active_month=
initial_visible_months.length
?initial_visible_months[
initial_visible_months.length-1
]
:null;
let months_html=
initial_visible_months.map(m=>`
<div
class="month-pill ${m===initial_active_month?"active":""}"
data-month="${frappe.utils.escape_html(m)}">
${month_short_names[m]}
</div>
`).join("");
$(wrapper).find(".layout-main-section").html(`
<div
class="branch-scorecard-page"
id="scorecard-root">
<div class="scorecard-view-tabs">
<div
class="scorecard-view-tab active"
data-view="branch">
<span>
▣
</span>
<span>
Branch Wise
</span>
</div>
<div
class="scorecard-view-tab"
data-view="zone">
<span>
◉
</span>
<span>
Zone Wise
</span>
</div>
<div
class="scorecard-view-tab"
data-view="com">
<span>
♟
</span>
<span>
Region Wise
</span>
</div>
<button
type="button"
id="scorecard-refresh-btn"
class="scorecard-refresh-btn"
style="margin-left:auto;"
title="Clear cache &amp; hard refresh"
aria-label="Clear cache and hard refresh">
<i class="fa fa-refresh"></i>
<span>Refresh</span>
</button>
<div
class="scorecard-logged-user"
id="scorecard-logged-user"
title="Logged-in User">
<div
class="scorecard-user-avatar"
id="scorecard-user-avatar">
<i class="fa fa-user"></i>
</div>
<div class="scorecard-user-details">
<div
class="scorecard-user-name"
id="scorecard-user-name">
Loading...
</div>
<div
class="scorecard-user-id"
id="scorecard-user-id">
Emp ID: -
</div>
</div>
</div>
</div>
<div class="scorecard-view-container">
<div
class="scorecard-view-panel"
id="branch-wise-panel">
<div class="scorecard-layout">
<div class="scorecard-sidebar">
<div>
<div class="branch-search-field">
<span class="branch-search-label">
BRANCHES
</span>
<input
type="text"
id="sol-search"
class="form-control"
placeholder="Search branches..."
autocomplete="off"
>
<button
type="button"
id="branch-search-clear"
class="branch-search-clear"
title="Clear search"
aria-label="Clear search">
×
</button>
</div>
</div>
<div class="sidebar-scroll-content">
<div
id="scorecard-list"
class="scorecard-list">
<div
class="text-muted text-center"
style="font-size:13px;">
Loading branches...
</div>
</div>
</div>
</div>
<div class="scorecard-main">
<div class="dashboard-top-nav">
<div class="fy-container">
<div class="fy-field">
<span class="fy-field-label">
FY
</span>
<select
id="fy-dropdown"
class="fy-select">
${generate_financial_year_options()}
</select>
</div>
</div>
<div class="months-scroll">
${months_html}
</div>
</div>
<div class="scorecard-content">
<div id="scorecard-details">
<div class="empty-scorecard">
<div class="empty-icon">
📊
</div>
<h3>
Select a Branch Score Card
</h3>
<p>
Select any branch from the left sidebar to view the selected month's scorecard.
</p>
</div>
</div>
</div>
</div>
</div>
</div>
</div>
<div
class="zone-wise-panel"
id="zone-wise-panel"
style="display:none;">

<div class="zone-wise-filter-bar">

    <div class="zone-wise-fy-container">

        <div class="zone-wise-fy-field">

            <span class="zone-wise-fy-label">
                FY
            </span>

            <select
                id="zone-wise-fy"
                class="zone-wise-fy-select">
                ${generate_financial_year_options()}
            </select>

        </div>

    </div>

    <div
        id="zone-wise-months"
        class="zone-wise-months-scroll">
    </div>

</div>

<div id="zone-wise-content">

    <div class="zone-wise-loading">
        Loading Zone Wise Score Card...
    </div>

</div>

</div>
<div class="com-wise-panel" id="com-wise-panel" style="display:none;">

    <div class="com-wise-filter-bar">

        <div class="com-wise-fy-container">
            <div class="com-wise-fy-field">
                <span class="com-wise-fy-label">FY</span>

                <select
                    id="com-wise-fy"
                    class="com-wise-fy-select">
                    ${generate_financial_year_options()}
                </select>
            </div>
        </div>

        <div
            id="com-wise-months"
            class="com-wise-months-scroll">
        </div>

    </div>

    <div id="com-wise-content">
        <div class="com-wise-loading">
            Loading Region Wise Scorecard...
        </div>
    </div>

</div>
</div>
`);
function apply_branch_scorecard_access(){
    frappe.call({
        method:"sahayog.branch_score_card.page.branch_scorecard.branch_scorecard.get_branch_scorecard_access",
        callback:function(r){
            let access = r.message || {};

            let employee_name = access.employee_name || frappe.session.user || "User";
            let employee_number = access.employee_number || "-";

            $(wrapper).find("#scorecard-user-name").text(employee_name);
            $(wrapper).find("#scorecard-user-id").text("Emp ID: " + employee_number);

            console.log("========== BRANCH SCORECARD ACCESS DEBUG ==========");
            console.log("Logged-in User:", frappe.session.user);
            console.log("Full Backend Access Response:", access);
            console.log("Is Editor:", access.is_editor);
            console.log("Has Access:", access.has_access);
            console.log("Access Type:", access.access_type);
            console.log("Has SOL Access:", access.has_sol_access);
            console.log("Has Zone Access:", access.has_zone_access);
            console.log("Has Region Access:", access.has_region_access);
            console.log("==================================================");

            if(access.is_editor){
                load_sahayog_branches();
                return;
            }

            if(!access.has_access){

                $("#scorecard-no-access").remove();
                $("#scorecard-root").css({position:"relative", zIndex:0, isolation:"isolate"}).append(`
                    <div id="scorecard-no-access"
                    style="position:absolute;inset:0;z-index:10;background:#fff;
                    display:flex;flex-direction:column;align-items:center;
                    justify-content:center;gap:14px;text-align:center;">
                        <div style="font-size:28px;font-weight:800;color:#0b2427;">
                            Access Restricted 🔒
                        </div>
                        <div style="font-size:18px;color:#1c3639;font-weight:600;">
                            Please contact the Manager. If access was just given, click Refresh.
                        </div>
                        <button type="button" id="scorecard-check-access"
                        style="height:46px;padding:0 30px;border:1.5px solid #6f9499;
                        border-radius:999px;background:#edf4f5;color:#0b2427;
                        font-size:17px;font-weight:800;cursor:pointer;">
                            Refresh
                        </button>
                    </div>
                `);
                $("#scorecard-check-access").off("click").on("click", function(){
                    window.sahayog_recheck_scorecard_access(true);
                });
                return;
            }

            if(access.has_sol_access){
                $(".scorecard-view-tab[data-view='zone']").hide();
                $(".scorecard-view-tab[data-view='com']").hide();
            }else if(access.has_zone_access){
                $(".scorecard-view-tab[data-view='com']").hide();
            }else if(access.has_region_access){
                $(".scorecard-view-tab[data-view='zone']").hide();
            }

            load_sahayog_branches();
        }
    });
}

initialize_zone_wise_filters();
initialize_com_wise_filters();
apply_branch_scorecard_access();
/* =========================================================
   HARD REFRESH
   ========================================================= */
$("#scorecard-refresh-btn").on(
"click",
function(){
let refresh_button=$(this);
refresh_button.prop(
"disabled",
true
);
refresh_button
.find("i")
.addClass("fa-spin");
let hard_reload=function(){
try{
if(frappe.assets&&frappe.assets.clear_local_storage){
frappe.assets.clear_local_storage();
}
}catch(e){}
window.location.replace(
window.location.pathname+
"?_="+Date.now()
);
};
frappe.call({
method:"frappe.sessions.clear",
callback:hard_reload,
error:hard_reload
});
}
);
$("#sol-search").on(
"input",
function(){
let search_text=
String(
$(this).val()||
""
).trim();
$("#branch-search-clear").toggleClass(
"visible",
search_text.length>0
);
apply_branch_filters();
}
);
$("#branch-search-clear").on(
"click",
function(){
$("#sol-search").val("");
$(this).removeClass("visible");
render_sahayog_branch_list(
all_sahayog_branches
);
$("#sol-search").trigger("focus");
}
);
/* =========================================================
   FY CHANGE
   ========================================================= */
$("#fy-dropdown").on(
"change",
function(){

let selected_fy=$(this).val();

let current_active_month=
$(".month-pill.active").attr("data-month");

let selected_month=
render_month_capsules(
selected_fy,
current_active_month
);

if(
window.current_active_sol&&
selected_month
){

open_scorecard_for_selection(
window.current_active_sol,
selected_month,
selected_fy
);

}else if(!selected_month){

$("#scorecard-details").html(`
<div class="empty-scorecard">
<div class="empty-icon">
📊
</div>

<h3>
No Months Available
</h3>

<p>
No scorecard months are available for the selected FY yet.
</p>

</div>
`);

}

});

/* =========================================================
   ZONE WISE - INDEPENDENT FY CHANGE
   ========================================================= */

$(document).on(
    "change",
    "#zone-wise-fy",
    function(){

        let selected_fy =
            String(
                $(this).val() || ""
            ).trim();

        if(!selected_fy){
            return;
        }

        let current_zone_month =
            get_zone_selected_month();

        let selected_month =
            render_zone_month_capsules(
                selected_fy,
                current_zone_month
            );

        if(!selected_month){

            $("#zone-wise-content").html(`
                <div class="zone-wise-empty">

                    <div class="zone-wise-empty-title">
                        No Months Available
                    </div>

                    <div>
                        No months are available for
                        ${frappe.utils.escape_html(
                            selected_fy
                        )}.
                    </div>

                </div>
            `);

            return;
        }

        load_zone_wise_data(
            selected_fy,
            selected_month
        );

    }
);

/* =========================================================
   COM WISE - INDEPENDENT FY CHANGE
   ========================================================= */

$(document).on(
    "change",
    "#com-wise-fy",
    function(){

        let selected_fy =
            String(
                $(this).val() || ""
            ).trim();

        if(!selected_fy){
            return;
        }

        let current_com_month =
            get_com_selected_month();

        let selected_month =
            render_com_month_capsules(
                selected_fy,
                current_com_month
            );

        if(!selected_month){

            $("#com-wise-content").html(`
                <div class="com-wise-empty">
                    No months available for
                    ${frappe.utils.escape_html(
                        selected_fy
                    )}.
                </div>
            `);

            return;
        }

        load_com_wise_data(
            selected_fy,
            selected_month
        );

    }
);
/* =========================================================
   VIEW TABS
   ========================================================= */
$(document).on(
"click",
".scorecard-view-tab",
function(){
let selected_view=
$(this).attr("data-view");
$(".scorecard-view-tab").removeClass(
"active"
);
$(this).addClass("active");
$("#branch-wise-panel").hide();
$("#zone-wise-panel").hide();
$("#com-wise-panel").hide();
if(selected_view==="branch"){
$("#branch-wise-panel").show();
}else if(selected_view==="zone"){

    $("#zone-wise-panel").show();

    let zone_fy =
        get_zone_selected_fy();

    if(!zone_fy){

        zone_fy =
            get_current_financial_year();

        $("#zone-wise-fy").val(
            zone_fy
        );

    }

    let zone_month =
        get_zone_selected_month();

    if(!zone_month){

        zone_month =
            get_current_calendar_month_name();

        zone_month =
            render_zone_month_capsules(
                zone_fy,
                zone_month
            );

    }

    load_zone_wise_data(
        zone_fy,
        zone_month
    );
}else if(selected_view==="com"){

    $("#com-wise-panel").show();

    let com_fy =
        $("#com-wise-fy").val();

    if(!com_fy){

        com_fy =
            get_current_financial_year();

        $("#com-wise-fy").val(
            com_fy
        );

    }

    let com_month =
        get_com_selected_month();

    if(!com_month){

        com_month =
            get_current_calendar_month_name();

        com_month =
            render_com_month_capsules(
                com_fy,
                com_month
            );

    }

    load_com_wise_data(
        com_fy,
        com_month
    );

}
}
);
/* =========================================================
    MONTH CLICK
    ========================================================= */

$(document).on(
    "click",
    ".month-pill",
    function(){

        let selected_month =
            $(this).attr("data-month");

        let selected_fy =
            $("#fy-dropdown").val();

        $(".month-pill").removeClass("active");

        $(this).addClass("active");

        if(window.current_active_sol){

            open_scorecard_for_selection(
                window.current_active_sol,
                selected_month,
                selected_fy
            );

        }else{

            frappe.msgprint({
                title:__("Select Branch"),
                indicator:"orange",
                message:__(
                    "Please select a branch from the sidebar first."
                )
            });
        }
    }
);

/* =========================================================
   ZONE WISE - INDEPENDENT MONTH CLICK
   ========================================================= */

$(document).on(
    "click",
    "#zone-wise-months .zone-month-pill",
    function(){

        let selected_month =
            $(this).attr("data-month");

        let selected_fy =
            $("#zone-wise-fy").val();

        if(
            !selected_fy ||
            !selected_month
        ){
            return;
        }

        $("#zone-wise-months .zone-month-pill")
            .removeClass("active");

        $(this).addClass("active");

        load_zone_wise_data(
            selected_fy,
            selected_month
        );

    }
);

/* =========================================================
   COM WISE - INDEPENDENT MONTH CLICK
   ========================================================= */

$(document).on(
    "click",
    "#com-wise-months .com-month-pill",
    function(){

        let selected_month =
            $(this).attr("data-month");

        let selected_fy =
            $("#com-wise-fy").val();

        if(
            !selected_fy ||
            !selected_month
        ){
            return;
        }

        $("#com-wise-months .com-month-pill")
            .removeClass("active");

        $(this).addClass("active");

        load_com_wise_data(
            selected_fy,
            selected_month
        );

    }
);
/* =========================================================
   CLEAN SCORECARD CSS BEFORE FORM NAVIGATION
   ========================================================= */
function cleanup_branch_scorecard_before_navigation(){
$("#branch-scorecard-style").remove();
$("#scorecard-root").remove();
$("html,body").removeAttr("style");
$(".layout-main-section").removeAttr("style");
$(".layout-main-section-wrapper").removeAttr("style");
$(".page-container").removeAttr("style");
$(".form-page").removeAttr("style");
$(".branch-scorecard-page").removeAttr("style");
$("body").removeClass(
"no-scroll"
);
}
/* =========================================================
   EXACT CRL RECORD NAVIGATION
   ========================================================= */
function get_crl_year_from_fy_and_month(
selected_fy,
selected_month
){
let fy_parts=
String(
selected_fy||""
).split("-");
let start_year=
parseInt(
fy_parts[0],
10
);
if(Number.isNaN(start_year)){
return null;
}
let january_to_march=[
"January",
"February",
"March"
];
if(
january_to_march.includes(
String(selected_month||"")
)
){
return start_year+1;
}
return start_year;
}
function open_exact_crl_record(){
let sol_id=
String(
window.current_active_sol||
""
).trim();
let selected_month=
String(
$(".month-pill.active").attr("data-month")||
get_selected_month()||
""
).trim();
let selected_fy=
String(
$("#fy-dropdown").val()||
""
).trim();
if(!sol_id){
frappe.msgprint({
title:__("Select Branch"),
indicator:"orange",
message:__("Please select a branch first.")
});
return;
}
if(!selected_month){
frappe.msgprint({
title:__("Select Month"),
indicator:"orange",
message:__("Please select a month first.")
});
return;
}
let crl_year=
get_crl_year_from_fy_and_month(
selected_fy,
selected_month
);
if(!crl_year){
frappe.msgprint({
title:__("Invalid FY"),
indicator:"red",
message:__(
"Unable to determine the CRL record year."
)
});
return;
}
let crl_record_name=
`${sol_id}-${selected_month}-${crl_year}`;
console.log(
"Opening exact CRL record:",
{
sol_id:sol_id,
month:selected_month,
year:crl_year,
record_name:crl_record_name
}
);
frappe.db.get_doc(
"CRL Monitoring and Branch Opening and Closing",
crl_record_name
).then(function(doc){
if(
doc&&
doc.name
){
window.open(
`/app/crl-monitoring-and-branch-opening-and-closing/${encodeURIComponent(doc.name)}`,
"_blank"
);
return;
}
throw new Error(
"CRL record not returned"
);
}).catch(function(error){
console.warn(
"Exact CRL record not found. Searching by fields.",
error
);
frappe.db.get_list(
"CRL Monitoring and Branch Opening and Closing",
{
fields:[
"name",
"sol_id",
"month",
"year"
],
filters:{
sol_id:sol_id,
month:selected_month,
year:crl_year
},
order_by:"modified desc",
limit_page_length:1
}
).then(function(records){
if(
records&&
records.length
){
cleanup_branch_scorecard_before_navigation();
frappe.set_route(
"Form",
"CRL Monitoring and Branch Opening and Closing",
records[0].name
);
return;
}
frappe.msgprint({
title:__("CRL Record Not Found"),
indicator:"orange",
message:`
CRL record not found for<br><br>
<b>SOL ID:</b>
${frappe.utils.escape_html(sol_id)}
<br>
<b>Month:</b>
${frappe.utils.escape_html(selected_month)}
<br>
<b>Year:</b>
${frappe.utils.escape_html(String(crl_year))}
<br><br>
<b>Expected Record Name:</b>
${frappe.utils.escape_html(crl_record_name)}
`
});
}).catch(function(list_error){
console.error(
"CRL record search error:",
list_error
);
frappe.msgprint({
title:__("CRL Record Not Found"),
indicator:"red",
message:`
Unable to open the CRL record.<br><br>
Expected Record Name:
<b>${frappe.utils.escape_html(crl_record_name)}</b>
`
});
});
});
}
/* =========================================================
   OTHER SCORECARD FUNCTION NAVIGATION CONFIG
   ========================================================= */
function get_scorecard_function_navigation_config(
function_name
){
let navigation_map={
"Account Opening Operations":{
doctype:"Account Opening Operations",
type:"month_year"
},
"Miscellaneous":{
doctype:"Miscellaneous",
type:"month_year"
},
"Audit and Compliance":{
doctype:"Audit and Compliance",
type:"branch_year"
},
"Deductions towards Errors / Lapses":{
doctype:"Branch Score Card Deductions",
type:"branch_year"
}
};
return navigation_map[
function_name
]||null;
}
/* =========================================================
   EXACT SCORECARD FUNCTION RECORD NAVIGATION
   ========================================================= */
function open_exact_scorecard_function_record(
function_name
){
let config=
get_scorecard_function_navigation_config(
function_name
);
if(!config){
frappe.msgprint({
title:__("Navigation Not Configured"),
indicator:"orange",
message:
`No navigation configuration found for <b>${frappe.utils.escape_html(function_name)}</b>.`
});
return;
}
let sol_id=
String(
window.current_active_sol||
""
).trim();
let selected_month=
String(
$(".month-pill.active").attr("data-month")||
get_selected_month()||
""
).trim();
let selected_fy=
String(
$("#fy-dropdown").val()||
""
).trim();
if(!sol_id){
frappe.msgprint({
title:__("Select Branch"),
indicator:"orange",
message:__(
"Please select a branch before opening the record."
)
});
return;
}
if(!selected_month){
frappe.msgprint({
title:__("Select Month"),
indicator:"orange",
message:__(
"Please select a month before opening the record."
)
});
return;
}
let selected_year=
get_crl_year_from_fy_and_month(
selected_fy,
selected_month
);
if(!selected_year){
frappe.msgprint({
title:__("Year Not Found"),
indicator:"orange",
message:__(
"Unable to determine the selected financial year."
)
});
return;
}
function open_record(record_name){
let route_name=
config.doctype
.toLowerCase()
.replace(/\s+/g,"-")
.replace(/\//g,"-");
window.open(
`/app/${route_name}/${encodeURIComponent(record_name)}`,
"_blank"
);
}
function open_filtered_list(filters){
let route_name=
config.doctype
.toLowerCase()
.replace(/\s+/g,"-")
.replace(/\//g,"-");
let query=
new URLSearchParams(filters).toString();
window.open(
`/app/${route_name}?${query}`,
"_blank"
);
}
if(config.type==="month_year"){
let record_name=
`${sol_id}-${selected_month}-${selected_year}`;
console.log(
"Opening exact scorecard function record:",
{
doctype:config.doctype,
sol_id:sol_id,
month:selected_month,
year:selected_year,
record_name:record_name
}
);
frappe.db.get_doc(
config.doctype,
record_name
).then(function(doc){
if(
doc&&
doc.name
){
open_record(
doc.name
);
return;
}
throw new Error(
"Record not returned"
);
}).catch(function(error){
console.warn(
"Exact record not found. Searching by fields.",
error
);
frappe.db.get_list(
config.doctype,
{
fields:[
"name",
"sol_id",
"month",
"year"
],
filters:{
sol_id:sol_id,
month:selected_month,
year:selected_year
},
order_by:"modified desc",
limit_page_length:1
}
).then(function(records){
if(
records&&
records.length
){
open_record(
records[0].name
);
return;
}
open_filtered_list({
sol_id:sol_id,
month:selected_month,
year:selected_year
});
}).catch(function(list_error){
console.error(
"Scorecard function record search error:",
list_error
);
open_filtered_list({
sol_id:sol_id,
month:selected_month,
year:selected_year
});
});
});
return;
}
if(config.type==="branch_year"){
frappe.db.get_list(
config.doctype,
{
fields:[
"name",
"sol_id",
"branch_name",
"year"
],
filters:{
sol_id:sol_id,
year:selected_year
},
order_by:"modified desc",
limit_page_length:1
}
).then(function(records){
console.log(
"Branch-year scorecard function search:",
{
doctype:config.doctype,
sol_id:sol_id,
year:selected_year,
records:records
}
);
if(
records&&
records.length
){
open_record(
records[0].name
);
return;
}
open_filtered_list({
sol_id:sol_id,
year:selected_year
});
}).catch(function(error){
console.error(
"Branch-year scorecard function search error:",
error
);
open_filtered_list({
sol_id:sol_id,
year:selected_year
});
});
return;
}
}
/* =========================================================
   CRL CLICK HANDLER
   ========================================================= */
$(document).off(
"click.branch_scorecard_function",
".function-link"
);
$(document).on(
"click.branch_scorecard_function",
".function-link",
function(e){
e.preventDefault();
e.stopPropagation();
let function_name=
String(
$(this).attr(
"data-function-name"
)||
""
).trim();
if(
function_name===
"CRL Monitoring and Branch Opening / Closing"
){
open_exact_crl_record();
}
}
);
/* =========================================================
   OTHER FUNCTION CLICK HANDLER
   ========================================================= */
$(document).off(
"click.branch_scorecard_other_function",
".scorecard-function-nav-link"
);
$(document).on(
"click.branch_scorecard_other_function",
".scorecard-function-nav-link",
function(e){
e.preventDefault();
e.stopPropagation();
let function_name=
String(
$(this).attr(
"data-function-name"
)||
""
).trim();
if(
function_name===
"Account Opening Operations"||
function_name===
"Miscellaneous"||
function_name===
"Audit and Compliance"||
function_name===
"Deductions towards Errors / Lapses"
){
open_exact_scorecard_function_record(
function_name
);
}
}
);
};
/* =========================================================
   GLOBAL DATA
   ========================================================= */
let all_sahayog_branches=[];
let all_scorecard_records=[];
window.current_active_sol=null;
/* =========================================================
   COMMON HELPERS
   ========================================================= */
function get_selected_month(){
return $(".month-pill.active").attr("data-month")
||
get_current_calendar_month_name();
}
function is_valid_sahayog_branch(record){
let sol_id=String(
record.sol_id||
record.name||
""
).trim();
let branch_type=String(
record.branch_type||
""
).trim().toLowerCase();
let is_numeric_sol=
/^\d+$/.test(sol_id);
let is_not_zonal=
branch_type!=="zonal";
return is_numeric_sol&&is_not_zonal;
}
/* =========================================================
   LOAD SAHAYOG BRANCHES
   ========================================================= */
function load_sahayog_branches(){
frappe.call({
method:"sahayog.branch_score_card.page.branch_scorecard.branch_scorecard.get_visible_branch_records",
callback:function(r){

if(r.message){
let all_records=
r.message||[];
let excluded_branches=
all_records.filter(
record=>
!is_valid_sahayog_branch(record)
);
all_sahayog_branches=
all_records.filter(
record=>
is_valid_sahayog_branch(record)
);

all_sahayog_branches.sort(
(a, b) =>
Number(
String(
a.sol_id||
a.name||
""
).trim()
) -
Number(
String(
b.sol_id||
b.name||
""
).trim()
)
);
console.log(
"Total Sahayog Branch records loaded:",
all_records.length
);
console.log(
"Valid sidebar branches:",
all_sahayog_branches.length
);
console.log(
"Excluded branches:",
excluded_branches.length
);
if(excluded_branches.length){
console.table(
excluded_branches.map(
record=>({
SOL_ID:
record.sol_id||
record.name||
"",
Branch:
record.branch||
"",
Branch_Type:
record.branch_type||
""
})
)
);
}
render_sahayog_branch_list(
all_sahayog_branches
);
if(
    $(".scorecard-view-tab.active").attr("data-view")==="zone"
){

    load_zone_wise_data(
        get_zone_selected_fy(),
        get_zone_selected_month()
    );

}
}else{
all_sahayog_branches=[];
render_sahayog_branch_list(
all_sahayog_branches
);
}
},
error:function(error){
console.error(
"Sahayog Branch load error:",
error
);
$("#scorecard-list").html(`
<div
class="text-danger text-center p-2"
style="font-size:13px;">
Unable to load branches.
</div>
`);
}
});
}
/* =========================================================
   RENDER BRANCH LIST
   ========================================================= */
function render_sahayog_branch_list(branches){
let html="";
let valid_branches=
(branches||[])
.filter(
record=>
is_valid_sahayog_branch(record)
);
if(!valid_branches.length){
$("#scorecard-list").html(`
<div
class="text-muted text-center p-2"
style="font-size:13px;">
No branches found.
</div>
`);
return;
}
valid_branches.forEach(record=>{
let raw_branch_name=
String(
record.branch||
""
).trim();
let b_name=
raw_branch_name;
if(
raw_branch_name.toLowerCase()!=="main branch"
){
b_name=
raw_branch_name.replace(
/\s+BRANCH$/i,
""
).trim();
}
let sol_id=
record.sol_id||
record.name||
"";
let zone=
String(
record.zone||
""
).trim();
let region=
String(
record.region||
""
).trim();
let district=
String(
record.district||
""
).trim();
let zone_display=
zone
.replace(
/\s*\([^)]*\)\s*$/i,
""
)
.replace(
/\s*[-–—]\s*[A-Z]{2,3}\s*$/i,
""
)
.trim();
let region_display=
region;
let district_display=
district;
let initial=
b_name.charAt(0).toUpperCase()||
"B";
let is_active=
window.current_active_sol===
String(sol_id).trim()
?"active"
:"";
html+=`
<div
class="scorecard-list-item ${is_active}"
data-sol-id="${frappe.utils.escape_html(sol_id)}"
onclick="select_sahayog_branch('${encodeURIComponent(sol_id)}')">
<div class="branch-item-content">
<div class="branch-avatar">
${frappe.utils.escape_html(initial)}
</div>
<div style="min-width:0;">
<div class="scorecard-branch-name">
${frappe.utils.escape_html(b_name)}
<span style="font-weight:700;">
- ${frappe.utils.escape_html(sol_id)}
</span>
</div>
<div class="scorecard-record-info">
<span>
${frappe.utils.escape_html(zone_display)}
</span>
<span>•</span>
<span>
${frappe.utils.escape_html(region_display)}
</span>
<span>•</span>
<span>
${frappe.utils.escape_html(district_display)}
</span>
</div>
</div>
</div>
<div class="active-check">
✓
</div>
</div>
`;
});
$("#scorecard-list").html(html);
}
/* =========================================================
   SEARCH
   ========================================================= */
function apply_branch_filters(){
let search_text=(
$("#sol-search").val()||
""
).toLowerCase().trim();
let filtered_branches=
all_sahayog_branches.filter(record=>{
let sol_id=String(
record.sol_id||
record.name||
""
).toLowerCase();
let branch=String(
record.branch||
""
).toLowerCase();
let zone=String(
record.zone||
""
).toLowerCase();
let region=String(
record.region||
""
).toLowerCase();
let district=String(
record.district||
""
).toLowerCase();
return !search_text||
sol_id.includes(search_text)||
branch.includes(search_text)||
zone.includes(search_text)||
region.includes(search_text)||
district.includes(search_text);
});
render_sahayog_branch_list(
filtered_branches
);
}
window.select_sahayog_branch=
function(encoded_sol_id){
let sol_id=
decodeURIComponent(encoded_sol_id);
window.current_active_sol=
String(sol_id).trim();
$(".scorecard-list-item").removeClass(
"active"
);
$(
`.scorecard-list-item[data-sol-id="${CSS.escape(sol_id)}"]`
).addClass("active");
let selected_month=
get_selected_month();
let selected_fy=
$("#fy-dropdown").val();
open_scorecard_for_selection(
sol_id,
selected_month,
selected_fy
);
};
/* =========================================================
   SCORECARD LOAD
   ========================================================= */
function open_scorecard_for_selection(
sol_id,
selected_month,
selected_fy
){
if(!sol_id||!selected_month){
return;
}
frappe.db.get_list(
"Branch Score Card",
{
fields:[
"name",
"branch",
"branch_name",
"zone",
"region",
"district",
"branch_opening_date",
"regional_operations_manager",
"cluster_operations_manager",
"regional__zonal_head",
"ch_dh_adh",
"month",
"year",
"modified"
],
filters:{
branch:sol_id,
month:selected_month
},
order_by:"modified desc",
limit_page_length:0
}
).then(records=>{
all_scorecard_records=
records||[];
let target_record=
find_scorecard_record(
records,
sol_id,
selected_month,
selected_fy
);
if(target_record){
open_scorecard_record(
encodeURIComponent(
target_record.name
)
);
return;
}
load_branch_details_for_not_available(
sol_id,
selected_month,
selected_fy
);
}).catch(error=>{
console.error(
"Score Card load error:",
error
);
load_branch_details_for_not_available(
sol_id,
selected_month,
selected_fy
);
});
}
/* =========================================================
   LOAD BRANCH DETAILS WHEN SCORECARD IS NOT AVAILABLE
   ========================================================= */
function load_branch_details_for_not_available(
sol_id,
selected_month,
selected_fy
){
frappe.db.get_list(
"Sahayog Branch",
{
fields:[
"name",
"sol_id",
"branch",
"zone",
"region",
"district",
"regional_operations_manager",
"cluster_operations_manager",
"regional__zonal_head",
"ch_dh_adh"
],
filters:{
sol_id:sol_id
},
limit_page_length:1
}
).then(branch_records=>{
let branch_doc=
branch_records&&
branch_records.length
?branch_records[0]
:null;
render_scorecard_not_available(
sol_id,
selected_month,
selected_fy,
branch_doc
);
}).catch(branch_error=>{
console.error(
"Sahayog Branch load error:",
branch_error
);
render_scorecard_not_available(
sol_id,
selected_month,
selected_fy,
null
);
});
}
/* =========================================================
   SCORECARD NOT AVAILABLE
   ========================================================= */
function render_scorecard_not_available(
sol_id,
selected_month,
selected_fy,
branch_doc
){
branch_doc=
branch_doc||{};
let branch_name=
String(
branch_doc.branch||
""
).trim();
if(!branch_name){
branch_name="Branch";
}
if(
branch_name.toLowerCase()!=="main branch"
){
branch_name=
branch_name.replace(
/\s+BRANCH$/i,
""
).trim();
}
let zone=
String(
branch_doc.zone||
"-"
).trim();
let region=
String(
branch_doc.region||
"-"
).trim();
let regional_operations_manager=
String(
branch_doc.regional_operations_manager||
"-"
).trim();
let cluster_operations_manager=
String(
branch_doc.cluster_operations_manager||
"-"
).trim();
let regional_zonal_head=
String(
branch_doc.regional__zonal_head||
"-"
).trim();
let ch_dh_adh=
String(
branch_doc.ch_dh_adh||
"-"
).trim();
let branch_header_html=`
<div class="combined-branch-score-card">
<div class="combined-main-row">
<div class="combined-score-header">
<div class="combined-score-title">
${frappe.utils.escape_html(
branch_name
)}
— SCORE CARD
</div>
<div class="combined-score-meta">
SOL ID:
<strong>
${frappe.utils.escape_html(
String(sol_id)
)}
</strong>
&nbsp; • &nbsp;
<strong>
${frappe.utils.escape_html(
String(selected_month)
)}
</strong>
&nbsp;
<strong>
${frappe.utils.escape_html(
String(selected_fy)
)}
</strong>
</div>
<div class="combined-grade-score-row">
<div
class="combined-grade-score"
style="
color:#d97706;
font-size:15px;
font-weight:900;
">
Score Card Not Available
</div>
<div class="combined-score-icon">
📊
</div>
</div>
</div>
<div class="combined-branch-details">
<div class="combined-branch-details-title">
Branch Details
</div>
<div class="combined-info-list">
<div class="combined-info-row">
<span class="combined-info-label">
Zone
</span>
<span class="combined-info-val">
${frappe.utils.escape_html(zone)}
</span>
</div>
<div class="combined-info-row">
<span class="combined-info-label">
CH/DH/ADH
</span>
<span class="combined-info-val">
${frappe.utils.escape_html(ch_dh_adh)}
</span>
</div>
<div class="combined-info-row">
<span class="combined-info-label">
Regional / Zonal Head
</span>
<span class="combined-info-val">
${frappe.utils.escape_html(regional_zonal_head)}
</span>
</div>
<div class="combined-info-row">
<span class="combined-info-label">
Region
</span>
<span class="combined-info-val">
${frappe.utils.escape_html(region)}
</span>
</div>
<div class="combined-info-row">
<span class="combined-info-label">
Regional Operations Manager
</span>
<span class="combined-info-val">
${frappe.utils.escape_html(
regional_operations_manager
)}
</span>
</div>
<div class="combined-info-row">
<span class="combined-info-label">
Cluster Operations Manager
</span>
<span class="combined-info-val">
${frappe.utils.escape_html(
cluster_operations_manager
)}
</span>
</div>
</div>
</div>
</div>
</div>
`;
let not_available_html=`
<div
class="empty-scorecard"
style="
padding:35px 20px 45px;
margin-top:12px;
border:1px solid var(--border);
border-radius:10px;
background:#fff;
">
<div
class="empty-icon"
style="
font-size:42px;
margin-bottom:10px;
">
📊
</div>
<h3>
Score Card Not Available
</h3>
<p>
Score card for SOL ID
<b>
${frappe.utils.escape_html(
String(sol_id)
)}
</b>,
Month
<b>
${frappe.utils.escape_html(
String(selected_month)
)}
</b>
and FY
<b>
${frappe.utils.escape_html(
String(selected_fy)
)}
</b>
is not available.
</p>
</div>
`;
$("#scorecard-details").html(`
<div class="scorecard-detail-page">
<div class="dashboard-grid-split">
${branch_header_html}
${not_available_html}
</div>
</div>
`);
}
/* =========================================================
   FIND SCORECARD RECORD
   ========================================================= */
function find_scorecard_record(
records,
sol_id,
selected_month,
selected_fy
){
if(!records||!records.length){
return null;
}
let fy_years=
String(selected_fy||"").split("-");
let start_yr=
fy_years[0]||
"";
let end_yr=
fy_years[1]||
start_yr;
let exact_year_record=
records.find(record=>{
let record_year=
String(
record.year||
""
).trim();
return record.branch===sol_id&&
String(
record.month||
""
).toLowerCase()===
String(
selected_month||
""
).toLowerCase()&&
(
record_year===selected_fy||
record_year===start_yr||
record_year===end_yr||
record_year.includes(start_yr)||
record_year.includes(end_yr)
);
});
if(exact_year_record){
return exact_year_record;
}
return records.find(record=>
record.branch===sol_id&&
String(
record.month||
""
).toLowerCase()===
String(
selected_month||
""
).toLowerCase()
)||null;
}
/* =========================================================
   PROGRESS COLOR
   ========================================================= */
function get_progress_color_class(
pct,
score
){
if(score<0||pct<40){
return"progress-red";
}
if(pct<65){
return"progress-orange";
}
if(pct<85){
return"progress-yellow";
}
return"progress-green";
}
/* =========================================================
   OPEN FULL SCORECARD
   ========================================================= */
window.open_scorecard_record=
function(encoded_name){
let name=
decodeURIComponent(encoded_name);
frappe.db.get_doc(
"Branch Score Card",
name
).then(doc=>{
window.current_active_sol=
String(
doc.branch||
""
).trim();
$(".scorecard-list-item").removeClass(
"active"
);
$(
`.scorecard-list-item[data-sol-id="${CSS.escape(window.current_active_sol)}"]`
).addClass("active");
if(doc.month){
$(".month-pill").removeClass(
"active"
);
$(
`.month-pill[data-month="${CSS.escape(doc.month)}"]`
).addClass("active");
}
render_scorecard_details(doc);
}).catch(error=>{
console.error(error);
$("#scorecard-details").html(`
<div
class="text-danger p-3"
style="font-size:13px;">
Unable to load details.
</div>
`);
});
};
/* =========================================================
   BRANCH SCORECARD DETAILS
   ========================================================= */
function render_scorecard_details(doc){
let items=
doc.table_cxyy||
[];
let total_score=0;
let total_weightage=0;
items.forEach(row=>{
total_score+=
parseFloat(row.score_obtain)||
0;
total_weightage+=
parseFloat(row.weightage)||
0;
});
let grouped_functions={};
items.forEach(row=>{
let function_name=
row.function||
"Other";
if(!grouped_functions[function_name]){
grouped_functions[function_name]={
score:0,
weightage:0,
rows:[]
};
}
grouped_functions[function_name].score+=
parseFloat(row.score_obtain)||
0;
grouped_functions[function_name].weightage+=
parseFloat(row.weightage)||
0;
grouped_functions[function_name].rows.push(
row
);
});
let desired_function_order=[
"CRL Monitoring and Branch Opening and Closing",
"CRL Monitoring and Branch Opening / Closing",
"Account Opening Operations",
"Miscellaneous",
"Audit and Compliance",
"Deductions towards Errors / Lapses"
];
let function_keys=[
...desired_function_order.filter(
function_name=>
grouped_functions[function_name]
),
...Object.keys(
grouped_functions
).filter(
function_name=>
!desired_function_order.includes(
function_name
)
)
];
let score_breakdown_items=
function_keys.slice(0,5).map(
function_name=>{
let f_data=
grouped_functions[function_name];
return{
name:function_name,
score:
parseFloat(f_data.score)||
0,
weightage:
parseFloat(f_data.weightage)||
0
};
});
let score_breakdown_html="";
if(score_breakdown_items.length){
let raw_scores=
score_breakdown_items.map(
item=>
parseFloat(item.score)||
0
);
let raw_weightages=
score_breakdown_items.map(
item=>
parseFloat(item.weightage)||
0
);
let minimum_score=
Math.min(
0,
...raw_scores
);
let maximum_value=
Math.max(
0,
...raw_scores,
...raw_weightages
);
let minimum_value=
Math.min(
0,
minimum_score
);
let positive_step=
maximum_value>0
?Math.ceil(
maximum_value/5
)
:1;
let negative_step=
minimum_value<0
?Math.ceil(
Math.abs(minimum_value)/5
)
:1;
let ruler_max=
Math.max(
positive_step*5,
maximum_value,
1
);
let ruler_min=
minimum_value<0
?-(
Math.max(
negative_step*5,
Math.abs(minimum_value)
)
)
:0;
let graph_range=
ruler_max-ruler_min;
let zero_position=
graph_range>0
?(
(ruler_max-0)/
graph_range
)*100
:100;
let ruler_values=[];
for(
let i=0;
i<=10;
i++
){
let value=
ruler_max-
(graph_range*i/10);
if(Math.abs(value)<0.000001){
value=0;
}
ruler_values.push(
Number(
value.toFixed(2)
)
);
}
let ruler_html=
ruler_values.map(
value=>`
<div class="score-breakdown-ruler-value">
${value}
</div>
`
).join("");
let grid_html=
ruler_values.map(
(value,index)=>{
let top=
(index/10)*100;
return`
<div
class="score-breakdown-grid-line"
style="top:${top}%">
</div>
`;
}
).join("");
let bars_html=
score_breakdown_items.map(
item=>{
let score=
parseFloat(item.score)||
0;
let weightage=
Math.max(
0,
parseFloat(item.weightage)||
0
);
let score_is_negative=
score<0;
let score_abs=
Math.abs(score);
let score_height=
graph_range>0
?(score_abs/graph_range)*100
:0;
let score_bar_top=
score_is_negative
?zero_position
:zero_position-score_height;
let score_value_top=
score_is_negative
?zero_position+score_height+2
:score_bar_top-18;
let score_bar_class=
score_is_negative
?"score-breakdown-negative-bar"
:"score-breakdown-score-bar";
let score_value_class=
score_is_negative
?"score-breakdown-negative-value"
:"";
let safe_score_height=
Math.max(
score_height,
.8
);
return`
<div class="score-breakdown-bar-group">
<div class="score-breakdown-bar-item">
<div
class="score-breakdown-bar-value ${score_value_class}"
style="top:${score_value_top}%">
${score} / ${weightage}
</div>
<div
class="score-breakdown-bar ${score_bar_class}"
style="
top:${score_bar_top}%;
height:${safe_score_height}%
"
title="Score Obtained: ${score} / Out of: ${weightage}">
</div>
<div class="score-breakdown-bar-label">
${frappe.utils.escape_html(
item.name
)}
</div>
</div>
</div>
`;
}
).join("");
score_breakdown_html=`
<div class="score-breakdown-card">
<div class="score-breakdown-title">
Score Breakdown
</div>
<div class="score-breakdown-legend">
<div class="score-breakdown-legend-item">
<span
class="score-breakdown-legend-box score-breakdown-legend-score">
</span>
<span>
Score Obtained / Out of
</span>
</div>
<div class="score-breakdown-legend-item">
<span
class="score-breakdown-legend-box"
style="background:#dc2626;">
</span>
<span>
Negative Score
</span>
</div>
</div>
<div class="score-breakdown-chart">
<div class="score-breakdown-ruler">
${ruler_html}
</div>
<div class="score-breakdown-plot">
${grid_html}
<div
class="score-breakdown-zero-line"
style="top:${zero_position}%">
</div>
<div
class="score-breakdown-zero-label"
style="top:${zero_position}%">
0
</div>
<div class="score-breakdown-bars">
${bars_html}
</div>
</div>
</div>
</div>
`;
}else{
score_breakdown_html=`
<div class="score-breakdown-card">
<div class="score-breakdown-title">
Score Breakdown
</div>
<div class="score-breakdown-empty">
No score data found.
</div>
</div>
`;
}
let scorecard_branch_name=
String(
doc.branch_name||
doc.branch||
""
).trim();
if(
scorecard_branch_name.toLowerCase()!=="main branch"
){
scorecard_branch_name=
scorecard_branch_name.replace(
/\s+BRANCH$/i,
""
).trim();
}
let main_branch_card_html=`
<div class="combined-branch-score-card">
<div class="combined-main-row">
<div class="combined-score-header">
<div class="combined-score-title">
${frappe.utils.escape_html(
scorecard_branch_name
)}
— SCORE CARD
</div>
<div class="combined-score-meta">
SOL ID:
<strong>
${frappe.utils.escape_html(
doc.branch||
""
)}
</strong>
&nbsp; • &nbsp;
<strong>
${frappe.utils.escape_html(
doc.month||
""
)}
</strong>
${doc.year
?` ${frappe.utils.escape_html(doc.year)}`
:""}
</div>
<div class="combined-grade-score-row">
<div class="combined-grade-score">
Grade Score —
${total_score}/${total_weightage}
</div>
<div class="combined-score-icon">
📊
</div>
</div>
</div>
<div class="combined-branch-details">
<div class="combined-branch-details-title">
Branch Details
</div>
<div class="combined-info-list">
<div class="combined-info-row">
<span class="combined-info-label">
Zone
</span>
<span class="combined-info-val">
${frappe.utils.escape_html(
doc.zone||
"-"
)}
</span>
</div>
<div class="combined-info-row">
<span class="combined-info-label">
CH/DH/ADH
</span>
<span class="combined-info-val">
${frappe.utils.escape_html(
doc.ch_dh_adh||
"-"
)}
</span>
</div>
<div class="combined-info-row">
<span class="combined-info-label">
Regional / Zonal Head
</span>
<span class="combined-info-val">
${frappe.utils.escape_html(
doc.regional__zonal_head||
"-"
)}
</span>
</div>
<div class="combined-info-row">
<span class="combined-info-label">
Region
</span>
<span class="combined-info-val">
${frappe.utils.escape_html(
doc.region||
"-"
)}
</span>
</div>
<div class="combined-info-row">
<span class="combined-info-label">
Regional Operations Manager
</span>
<span class="combined-info-val">
${frappe.utils.escape_html(
doc.regional_operations_manager||
"-"
)}
</span>
</div>
<div class="combined-info-row">
<span class="combined-info-label">
Cluster Operations Manager
</span>
<span class="combined-info-val">
${frappe.utils.escape_html(
doc.cluster_operations_manager||
"-"
)}
</span>
</div>
</div>
</div>
</div>
</div>
`;
let function_html="";
function_keys.forEach(
function_name=>{
let f_data=
grouped_functions[
function_name
];
let rows_html="";
f_data.rows.forEach(row=>{
let score=
parseFloat(
row.score_obtain
)||
0;
let weightage=
parseFloat(
row.weightage
)||
1;
let percentage=
Math.round(
(score/weightage)*100
);
let bar_width=
Math.max(
0,
Math.min(
100,
percentage
)
);
let row_color_class=
get_progress_color_class(
percentage,
score
);
rows_html+=`
<div class="parameter-item">
<div class="parameter-info">
<span class="parameter-name">
${frappe.utils.escape_html(
row.parameter||
"-"
)}
</span>
<span
class="parameter-values"
style="${
score<0
?"color:#dc2626;"
:""
}">
${row.score_obtain||0}
/
${row.weightage||0}
</span>
</div>
<div class="progress-bar-bg">
<div
class="progress-bar-fill ${row_color_class}"
style="width:${bar_width}%">
</div>
</div>
</div>
`;
});
let can_function_write =
frappe.user.has_role("System Manager") ||
frappe.user.has_role("Branch Scorecard Editor");
let is_crl_function=
function_name===
"CRL Monitoring and Branch Opening / Closing";
let is_other_navigation_function=
function_name===
"Account Opening Operations"||
function_name===
"Miscellaneous"||
function_name===
"Audit and Compliance"||
function_name===
"Deductions towards Errors / Lapses";
let function_title_html;
if(is_crl_function && can_function_write){
function_title_html=`
<div
class="function-title function-link"
data-function-name="${frappe.utils.escape_html(function_name)}"
title="Open CRL Monitoring and Branch Opening and Closing">
<span class="function-link-text">
${frappe.utils.escape_html(
function_name
)}
</span>
<span
class="function-edit-icon"
title="Open / Edit CRL Record">
<i class="fa fa-pencil"></i>
</span>
</div>
`;
}else if(is_other_navigation_function && can_function_write){
function_title_html=`
<div
class="function-title scorecard-function-nav-link"
data-function-name="${frappe.utils.escape_html(function_name)}"
title="Open ${frappe.utils.escape_html(function_name)}">
<span class="function-link-text">
${frappe.utils.escape_html(
function_name
)}
</span>
<span
class="function-edit-icon"
title="Open / Edit Record">
<i class="fa fa-pencil"></i>
</span>
</div>
`;
}else{
function_title_html=`
<div class="function-title">
${frappe.utils.escape_html(
function_name
)}
</div>
`;
}
function_html+=`
<div class="function-card">
<div class="function-header">
${function_title_html}
<div class="function-total">
${f_data.score}
/
${f_data.weightage}
</div>
</div>
${rows_html}
</div>
`;
});
$("#scorecard-details").html(`
<div class="scorecard-detail-page">
<div class="dashboard-grid-split">
${main_branch_card_html}
<div class="functions-grid-right">
${
function_html||
`
<div
class="text-muted text-center p-4"
style="font-size:13px;">
No functions data found in table.
</div>
`
}
</div>
</div>
${score_breakdown_html}
</div>
`);
}
/* =========================================================
   ZONE WISE - LOAD REAL DATA FROM PYTHON
   ========================================================= */
async function load_zone_wise_data(
selected_fy,
selected_month
){
let container=
$("#zone-wise-content");
if(!container.length){
return;
}
container.html(`
<div class="zone-wise-loading">
<i
class="fa fa-spinner fa-spin"
style="margin-right:8px;">
</i>
Loading Zone Wise BHSC Data...
</div>
`);
selected_fy=
String(
selected_fy||
""
).trim();
selected_month=
String(
selected_month||
""
).trim();
if(!selected_fy){
container.html(`
<div class="zone-wise-empty">
<div class="zone-wise-empty-title">
Invalid FY
</div>
<div>
Financial Year is not selected.
</div>
</div>
`);
return;
}
try{
let response=
await frappe.call({
method:
"sahayog.branch_score_card.page.branch_scorecard.branch_scorecard.get_zone_wise_bhsc",
args:{
selected_fy:selected_fy,
selected_month:
selected_month||null
},
freeze:false
});
let result=
response&&
response.message
?response.message
:null;
if(!result){
throw new Error(
"No response received from Zone Wise backend."
);
}
render_zone_wise_table(
result
);
}catch(error){
console.error(
"Zone Wise backend load error:",
error
);
let error_message=
"Unable to load Zone Wise data.";
if(
error&&
error.message
){
error_message=
String(error.message);
}
container.html(`
<div class="zone-wise-empty">
<div class="zone-wise-empty-title">
Unable to Load Zone Wise Data
</div>
<div>
${frappe.utils.escape_html(
error_message
)}
</div>
</div>
`);
}
}

// =========================================================
// COM WISE BHSC
// =========================================================

function load_com_wise_data(
    selected_fy,
    selected_month
){

    if(!selected_fy || !selected_month){

        $("#com-wise-content").html(`
            <div class="com-wise-empty">
                Please select Financial Year and Month.
            </div>
        `);

        return;
    }

    $("#com-wise-content").html(`
        <div class="com-wise-loading">
            Loading Region Wise BHSC Data...
        </div>
    `);

    frappe.call({

        method:
            "sahayog.branch_score_card.page.branch_scorecard.branch_scorecard.get_region_wise_bhsc",

        args:{
            selected_fy:selected_fy,
            selected_month:selected_month
        },

        callback:function(r){

            if(
                !r ||
                !r.message
            ){

                $("#com-wise-content").html(`
                    <div class="com-wise-empty">
                        No Region Wise data available.
                    </div>
                `);

                return;
            }

            render_com_wise_table(
                r.message
            );
        },

        error:function(){

            $("#com-wise-content").html(`
                <div class="com-wise-empty">
                    Unable to load Region Wise data.
                </div>
            `);
        }

    });
}


function render_com_wise_table(
    result
){

    if(
        !result ||
        result.available === false
    ){

        $("#com-wise-content").html(`
            <div class="com-wise-empty">
                ${
                    result && result.message
                    ? result.message
                    : "No Region Wise data available."
                }
            </div>
        `);

        return;
    }

    let zones =
        result.zones || [];

    let data =
        result.data || {};

    let zone_totals =
        result.zone_totals || {};

    let grand_total =
        result.grand_total || {};

    let trend_periods =
        result.trend_periods || [];

    let trend_regions =
        result.trend_regions || [];

    let trend_data =
        result.trend_data || {};

    let selected_month =
        sahayog_short_month(result.selected_month);

    let selected_year =
        result.selected_year || "";

    let previous_month =
        sahayog_short_month(result.previous_month);

    let previous_year =
        result.previous_year || "";

    function format_score(value){

        if(
            value === null ||
            value === undefined ||
            value === ""
        ){
            return "-";
        }

        let number =
            Number(value);

        if(
            !Number.isFinite(number)
        ){
            return "-";
        }

        return number.toFixed(2);
    }

    function get_change(selected, previous){

        if(
            selected === null ||
            selected === undefined ||
            previous === null ||
            previous === undefined ||
            selected === "" ||
            previous === ""
        ){
            return {
                value: "-",
                class_name: "",
                icon: ""
            };
        }

        let current =
            Number(selected);

        let old =
            Number(previous);

        if(
            !Number.isFinite(current) ||
            !Number.isFinite(old)
        ){
            return {
                value: "-",
                class_name: "",
                icon: ""
            };
        }

        let difference =
            current - old;

        if(
            Math.abs(difference) < 0.005
        ){
            return {
                value: "0.00",
                class_name: "bhsc-change-neutral",
                icon: "→"
            };
        }

        if(difference > 0){

            return {
                value: difference.toFixed(2),
                class_name: "bhsc-change-up",
                icon: "↑"
            };
        }

        return {
            value: Math.abs(difference).toFixed(2),
            class_name: "bhsc-change-down",
            icon: "↓"
        };
    }

    function score_html(item){

        let selected =
            item && item.has_selected_data
            ? format_score(item.selected)
            : "-";

        let previous =
            item && item.has_previous_data
            ? format_score(item.previous)
            : "-";

        let change =
            get_change(
                item && item.has_selected_data
                ? item.selected
                : null,
                item && item.has_previous_data
                ? item.previous
                : null
            );

        return `
            <td class="bhsc-score-cell">
                <span class="bhsc-score">
                    ${selected}
                </span>
            </td>

            <td class="bhsc-score-cell">
                <span class="bhsc-score">
                    ${previous}
                </span>
            </td>

            <td class="bhsc-change-cell">
                ${
                    change.value === "-"
                    ? "-"
                    : `
                        <span class="${change.class_name}">
                            <span class="bhsc-change-icon">
                                ${change.icon}
                            </span>
                            ${change.value}
                        </span>
                    `
                }
            </td>
        `;
    }

    let html = "";

    // =====================================================
    // HEADER
    // =====================================================

    html += `
        <div class="region-wise-dashboard">

            <div class="region-wise-heading">
                <div>
                    <div class="region-wise-title">
                        Region Wise BHSC Performance
                    </div>

                    <div class="region-wise-subtitle">
                        ${frappe.utils.escape_html(selected_month)}
                        ${frappe.utils.escape_html(String(selected_year))}
                        vs
                        ${frappe.utils.escape_html(previous_month)}
                        ${frappe.utils.escape_html(String(previous_year))}
                    </div>
                </div>
            </div>
    `;

    // =====================================================
    // KPI CARDS
    // =====================================================

    let grand_selected =
        grand_total.has_selected_data
        ? format_score(grand_total.selected)
        : "-";

    let grand_previous =
        grand_total.has_previous_data
        ? format_score(grand_total.previous)
        : "-";

    let grand_change =
        get_change(
            grand_total.has_selected_data
            ? grand_total.selected
            : null,
            grand_total.has_previous_data
            ? grand_total.previous
            : null
        );

    let total_com_count = 0;

    zones.forEach(function(zone){

        let zone_data =
            data[zone] || {};

        Object.keys(zone_data).forEach(function(region){

            if(region === "_total"){
                return;
            }

            let region_data =
                zone_data[region] || {};

            Object.keys(region_data).forEach(function(com){

                if(
                    com !== "_total" &&
                    com &&
                    com.toLowerCase() !== "not assigned"
                ){
                    total_com_count++;
                }
            });
        });
    });

    html += `
        <div class="region-wise-kpi-grid">

            <div class="region-wise-kpi-card">
                <div class="region-wise-kpi-label">
                    Grand BHSC
                </div>

                <div class="region-wise-kpi-value">
                    ${grand_selected}
                </div>
            </div>

            <div class="region-wise-kpi-card">
                <div class="region-wise-kpi-label">
                    Previous BHSC
                </div>

                <div class="region-wise-kpi-value">
                    ${grand_previous}
                </div>
            </div>

            <div class="region-wise-kpi-card">
                <div class="region-wise-kpi-label">
                    Variance
                </div>

                <div class="region-wise-kpi-value ${grand_change.class_name}">
                    ${
                        grand_change.value === "-"
                        ? "-"
                        : `
                            ${grand_change.icon}
                            ${grand_change.value}
                        `
                    }
                </div>
            </div>

            <div class="region-wise-kpi-card">
                <div class="region-wise-kpi-label">
                    Total COMs
                </div>

                <div class="region-wise-kpi-value">
                    ${total_com_count}
                </div>
            </div>

        </div>
    `;

    // =====================================================
    // REGION WISE TREND GRAPH
    // =====================================================

    // Trend graph container is appended below the table

    // =====================================================
    // TABLE
    // =====================================================

    if(
        !zones.length ||
        !Object.keys(data).length
    ){

        html += `
            <div class="com-wise-empty">
                No Region Wise data available for
                ${frappe.utils.escape_html(selected_month)}
                ${frappe.utils.escape_html(String(selected_year))}.
            </div>
        `;

        html += `</div>`;

        $("#com-wise-content").html(html);

        return;
    }

    html += `
        <div class="region-wise-table-wrapper">

            <table class="region-wise-power-table">

                <thead>
                    <tr>
                        <th class="hierarchy-column">
 Zone / Region / COM
 </th>

                        <th class="score-column">
                            ${frappe.utils.escape_html(selected_month)}
                            BHSC
                        </th>

                        <th class="score-column">
                            ${frappe.utils.escape_html(previous_month)}
                            BHSC
                        </th>

                        <th class="change-column">
                            Variance
                        </th>
                    </tr>
                </thead>

                <tbody>
    `;

    // =====================================================
    // ZONE
    // =====================================================

    zones.forEach(function(zone){

        let zone_data =
            data[zone] || {};

        let regions =
            Object.keys(zone_data)
            .filter(function(region){

                return (
                    region !== "_total" &&
                    region &&
                    region.toLowerCase() !== "not assigned"
                );
            });

        if(!regions.length){
            return;
        }

        // -------------------------------------------------
        // ZONE HEADER
        // -------------------------------------------------

        html += `
            <tr
                class="hierarchy-zone-row"
                data-zone="${frappe.utils.escape_html(zone)}"
            >

                <td class="tree-cell tree-zone">
                    <button
                        type="button"
                        class="hierarchy-toggle zone-toggle"
                        data-zone="${frappe.utils.escape_html(zone)}"
                        data-expanded="false"
                    >
                        <span class="hierarchy-arrow">
                            ▶
                        </span>

                        <span class="hierarchy-zone-name">
                            ${frappe.utils.escape_html(zone)}
                        </span>
                    </button>
                </td>
 ${score_html(zone_totals[zone] || {})}</tr>
        `;

        // -------------------------------------------------
        // REGIONS
        // -------------------------------------------------

        regions.forEach(function(region, region_index){

            let region_data =
                zone_data[region] || {};

            let coms =
                Object.keys(region_data)
                .filter(function(com){

                    return (
                        com !== "_total" &&
                        com &&
                        com.toLowerCase() !== "not assigned"
                    );
                });

            if(!coms.length){
                return;
            }

            let region_key =
                `${zone}::${region}`;

            // ---------------------------------------------
            // REGION HEADER
            // ---------------------------------------------

            html += `
                <tr
                    class="hierarchy-region-row"
                    data-zone="${frappe.utils.escape_html(zone)}"
                    data-region="${frappe.utils.escape_html(region)}"
                    data-region-index="${region_index}"
                >

                    <td class="tree-cell tree-region">
                        <button
                            type="button"
                            class="hierarchy-toggle region-toggle"
                            data-zone="${frappe.utils.escape_html(zone)}"
                            data-region="${frappe.utils.escape_html(region)}"
                            data-expanded="false"
                        >
                            <span class="hierarchy-arrow">
                                ▶
                            </span>

                            <span class="hierarchy-region-name">
                                ${frappe.utils.escape_html(region)}
                            </span>
                        </button>
                    </td>
 ${score_html(region_data["_total"] || {})}</tr>
            `;

            // ---------------------------------------------
            // COM ROWS
            // ---------------------------------------------

            coms.forEach(function(com){

                let item =
                    region_data[com] || {};

                html += `
                    <tr
                        class="hierarchy-com-row"
                        data-zone="${frappe.utils.escape_html(zone)}"
                        data-region="${frappe.utils.escape_html(region)}"
                        data-region-index="${region_index}"
                    >

                        <td class="com-name tree-cell tree-com">
                            ${frappe.utils.escape_html(com)}
                        </td>

                        ${score_html(item)}

                    </tr>
                `;
            });

            // ---------------------------------------------
            // REGION TOTAL
            // ---------------------------------------------

            let region_total =
                region_data["_total"] || {};

            // region total is shown on the Region row
        });

    });

    // =====================================================
    // GRAND TOTAL
    // =====================================================

    html += `
        <tr class="hierarchy-grand-total-row">

            <td>
                Grand Total
            </td>

            <td>
                ${grand_selected}
            </td>

            <td>
                ${grand_previous}
            </td>

            <td>
                ${
                    grand_change.value === "-"
                    ? "-"
                    : `
                        <span class="${grand_change.class_name}">
                            ${grand_change.icon}
                            ${grand_change.value}
                        </span>
                    `
                }
            </td>

        </tr>
    `;

    html += `
                </tbody>

            </table>

        </div>

    </div>
    `;

    html += `
        <div id="region-wise-trend-graph" style="margin-top:24px;"></div>
    `;

    $("#com-wise-content").html(html);

    render_region_side_panel(zones, data, zone_totals, selected_month, previous_month);

    let trend_region_zones = result.trend_region_zones || {};

    render_region_wise_trend_graph(
        trend_periods,
        trend_regions,
        trend_data,
        trend_region_zones
    );

    // Region Wise: keep all Zones and Regions collapsed by default
    $("#com-wise-content .hierarchy-region-row").hide();
    $("#com-wise-content .hierarchy-com-row").hide();
    $("#com-wise-content .hierarchy-region-total-row").hide();

    sahayog_lock_snapshot_height();
    setTimeout(sahayog_lock_snapshot_height, 400);
    sahayog_enlarge_delta_arrows();

    // =====================================================
    // ZONE TOGGLE
    // =====================================================

    $("#com-wise-content")
        .off("click.region-wise-zone")
        .on(
            "click.region-wise-zone",
            ".zone-toggle",
            function(){

                let zone =
                    $(this).attr("data-zone");

                let button =
                    $(this);

                let expanded =
                    button.attr("data-expanded") === "true";

                button.attr(
                    "data-expanded",
                    expanded ? "false" : "true"
                );

                button
                    .find(".hierarchy-arrow")
                    .text(
                        expanded
                        ? "▶"
                        : "▼"
                    );

                let region_rows =
                    $('#com-wise-content .hierarchy-region-row[data-zone="' +
                    zone +
                    '"]');

                let com_rows =
                    $('#com-wise-content .hierarchy-com-row[data-zone="' +
                    zone +
                    '"]');

                let total_rows =
                    $('#com-wise-content .hierarchy-region-total-row[data-zone="' +
                    zone +
                    '"]');

                if(expanded){

                    region_rows.hide();

                    com_rows.hide();

                    total_rows.hide();

                    region_rows
                        .find(".region-toggle")
                        .attr(
                            "data-expanded",
                            "false"
                        )
                        .find(".hierarchy-arrow")
                        .text("▶");

                } else {

                    region_rows.show();

                    com_rows.hide();

                    total_rows.hide();

                    region_rows
                        .find(".region-toggle")
                        .attr(
                            "data-expanded",
                            "false"
                        )
                        .find(".hierarchy-arrow")
                        .text("▶");
                }
            }
        );

    // =====================================================
    // REGION TOGGLE
    // =====================================================

    $("#com-wise-content")
        .off("click.region-wise-region")
        .on(
            "click.region-wise-region",
            ".region-toggle",
            function(){

                let zone =
                    $(this).attr("data-zone");

                let region =
                    $(this).attr("data-region");

                let button =
                    $(this);

                let expanded =
                    button.attr("data-expanded") === "true";

                button.attr(
                    "data-expanded",
                    expanded ? "false" : "true"
                );

                button
                    .find(".hierarchy-arrow")
                    .text(
                        expanded
                        ? "▶"
                        : "▼"
                    );

                let com_selector =
                    '#com-wise-content .hierarchy-com-row' +
                    '[data-zone="' + zone + '"]' +
                    '[data-region="' + region + '"]';

                let total_selector =
                    '#com-wise-content .hierarchy-region-total-row' +
                    '[data-zone="' + zone + '"]' +
                    '[data-region="' + region + '"]';

                if(expanded){

                    $(com_selector).hide();

                    $(total_selector).hide();

                } else {

                    $(com_selector).show();

                    $(total_selector).show();
                }
            }
        );
}


function render_region_wise_trend_graph(
periods,
regions,
data,
region_zones
){

let container =
$("#region-wise-trend-graph");

if(!container.length){
return;
}

/* -------------------------------------------------------
   VALIDATION
   ------------------------------------------------------- */

if(
!regions ||
!regions.length
){

container.html(`
<div class="region-trend-empty">
No Region Wise data available.
</div>
`);

return;
}

/* -------------------------------------------------------
   SELECTED / LATEST PERIOD
   One bar per Region
   ------------------------------------------------------- */

let selected_period =
periods && periods.length
? periods[periods.length - 1]
: null;

let period_label =
selected_period
? String(selected_period.label || "")
: "";

/* -------------------------------------------------------
   REGION ORDER
   ZONE → REGION
   ------------------------------------------------------- */

let ordered_regions = [...regions];

let region_label = (key)=>{
let name = String(key).split("|").pop();
if(/^REGION-/i.test(name)){
return "R" + name.replace(/^REGION-/i, "");
}
return name;
};

/* -------------------------------------------------------
   DIMENSIONS
   ------------------------------------------------------- */

let chart_height = 330;

let left = 52;
let right = 35;
let top = 70;
let bottom = 50;

let bar_width = 22;
let bar_gap = 30;

let zone_gap = 30;
let x_offsets = [];
let _cursor = left;
let _prev_zone = null;

ordered_regions.forEach((region, i)=>{
let z = String(region_zones?.[region] || "Other");
if(_prev_zone !== null && z !== _prev_zone){
_cursor += zone_gap;
}
x_offsets.push(_cursor + bar_gap / 2);
_cursor += bar_width + bar_gap;
_prev_zone = z;
});

let chart_width = Math.max(1000, _cursor + right);

let plot_width =
chart_width -
left -
right;

let plot_height =
chart_height -
top -
bottom;

/* -------------------------------------------------------
   SCALE
   ------------------------------------------------------- */

let get_x = (index)=>x_offsets[index];

let get_y =
(value)=>{

let safe_value =
Math.max(
0,
Math.min(
100,
Number(value) || 0
)
);

return (
top +
plot_height -
(
safe_value / 100
) *
plot_height
);

};

/* -------------------------------------------------------
   SVG
   ------------------------------------------------------- */

if(!$("#region-trend-look-style").length){
$("head").append(
'<style id="region-trend-look-style">' +
'#region-wise-trend-graph .region-trend-chart-wrap{height:auto!important;overflow-x:auto!important;overflow-y:hidden!important;padding-bottom:6px;}' +
'#region-wise-trend-graph .region-trend-chart{height:auto!important;min-width:0!important;width:auto!important;}' +
'#region-wise-trend-graph .region-trend-svg{overflow:visible;}' +
'#region-wise-trend-graph .region-trend-bar:hover{opacity:.82;}' +
'</style>'
);
}

let svg = "";
let axis_svg = "";

svg += `
<svg
class="region-trend-svg"
viewBox="0 0 ${chart_width} ${chart_height}"
width="${chart_width}" height="${chart_height}"
style="display:block;max-width:none;width:${chart_width}px;height:${chart_height}px;"
preserveAspectRatio="xMinYMin meet"
>
<defs>
<linearGradient id="region-bar-shade" x1="0" y1="0" x2="0" y2="1">
<stop offset="0%" stop-color="#3f8a93" stop-opacity="1"/>
<stop offset="100%" stop-color="#b7dde0" stop-opacity="0.9"/>
</linearGradient>
</defs>
`;

/* -------------------------------------------------------
   HORIZONTAL GRID
   ------------------------------------------------------- */

for(
let score = 0;
score <= 100;
score += 10
){

let y =
get_y(score);

svg += `
<line
class="region-trend-grid-line" style="stroke:#94a3b8;stroke-width:1;stroke-opacity:0.55;"
x1="${left}"
y1="${y}"
x2="${chart_width - right}"
y2="${y}"
/>
`;

axis_svg += `
<text
class="region-trend-axis-label"
style="font-size:11px;font-weight:600;fill:#94a3b8;"
x="${left - 10}"
y="${y + 4}"
text-anchor="end"
>
${score}
</text>
`;

}

/* -------------------------------------------------------
   ZONE GROUPS
   ------------------------------------------------------- */

let zone_groups = [];

ordered_regions.forEach(
(region,index)=>{

let zone =
String(
region_zones?.[region] || "Other"
);

let last =
zone_groups[
zone_groups.length - 1
];

if(
!last ||
last.zone !== zone
){

zone_groups.push({
zone: zone,
start: index,
end: index
});

}else{

last.end = index;

}

}
);

/* ZONE BACKGROUND BANDS */

zone_groups.forEach(
(group,gi)=>{

if(gi % 2 === 0){
return;
}

let half = (bar_gap + zone_gap) / 2;
let bx = get_x(group.start) - half;
let bw = (get_x(group.end) + bar_width + half) - bx;

svg += `
<rect
x="${bx}"
y="${top - 20}"
width="${bw}"
height="${plot_height + 30}"
rx="0"
style="fill:#2f6f77;fill-opacity:0.035;"
/>
`;

}
);

/* -------------------------------------------------------
   VERTICAL GRID + BARS
   ------------------------------------------------------- */

ordered_regions.forEach(
(region,index)=>{

let x =
get_x(index);

let region_data =
data[region] || {};

let cell_value =
region_data[period_label];

let value = sahayog_cell_number(cell_value);
if(value === null){
value = 0;
}

let y =
get_y(value);

let bar_height =
top +
plot_height -
y;

/* vertical grid */

svg += `
<line
class="region-trend-vertical-grid-line" style="stroke:#94a3b8;stroke-width:1;stroke-opacity:0.35;stroke-dasharray:3 4;"
x1="${x + bar_width / 2}"
y1="${top}"
x2="${x + bar_width / 2}"
y2="${top + plot_height}"
/>
`;

/* bar */

svg += `
<rect
class="region-trend-bar" style="fill:url(#region-bar-shade);"
x="${x}"
y="${y}"
width="${bar_width}"
height="${Math.max(bar_height,0)}"
rx="0"
data-region="${String(region)}"
data-zone="${String(region_zones?.[region] || "Other")}"
data-period="${period_label}"
data-value="${value}"
data-tooltip="${region_label(region)} | ${String(region_zones?.[region] || "Other")} | ${period_label} | ${value.toFixed(2)}%"
/>
`;

/* value */

svg += `
<text
class="region-trend-bar-value" style="font-size:11px;font-weight:700;fill:#2f6f77;"
x="${x + bar_width / 2}"
y="${Math.max(y - 8, top + 12)}"
text-anchor="middle"
>
${value.toFixed(0)}
</text>
`;

/* region */

svg += `
<text
class="region-trend-axis-label"
x="${x + bar_width / 2}"
y="${chart_height - 30}" style="font-size:11px;font-weight:600;fill:#64748b;"
text-anchor="middle"
>
${region_label(region)}
</text>
`;

}
);

/* -------------------------------------------------------
   PREVIOUS PERIOD PROGRESS LINE
   ------------------------------------------------------- */

let previous_period =
periods && periods.length > 1
? periods[periods.length - 2]
: null;

if(previous_period){

let previous_label =
String(previous_period.label || "");

let line_points = [];
let line_circles = "";

ordered_regions.forEach(
(region,index)=>{

let raw =
(data[region] || {})[previous_label];

if(raw && typeof raw === "object"){
raw = raw.average;
}

if(
raw === null ||
raw === undefined ||
!Number.isFinite(Number(raw))
){
return;
}

let v = Number(raw);
let px = get_x(index) + bar_width / 2;
let py = get_y(v);

line_points.push(px + "," + py);

line_circles += `
<circle cx="${px}" cy="${py}" r="4"
fill="#f59e0b" stroke="#ffffff" stroke-width="1.5">
<title>${region_label(region)} | ${previous_label} | ${v.toFixed(2)}%</title>
</circle>
`;

}
);

if(line_points.length){

svg += `
<polyline
points="${line_points.join(" ")}"
fill="none"
stroke="#f59e0b"
stroke-width="2.5"
stroke-linejoin="round"
stroke-linecap="round"
/>
`;

svg += line_circles;

}

}

/* -------------------------------------------------------
   ZONE LABELS + SEPARATORS
   ------------------------------------------------------- */

zone_groups.forEach(
(group,group_index)=>{

let start_x =
get_x(group.start);

let end_x =
get_x(group.end) +
bar_width;

let center_x =
(start_x + end_x) / 2;

svg += `
<text
class="region-trend-zone-label" style="font-size:12px;font-weight:800;fill:#2f6f77;letter-spacing:.6px;"
x="${center_x}"
y="32"
text-anchor="middle"
>
${group.zone}
</text>
`;

if(
group_index > 0
){

let separator_x = start_x - (bar_gap + zone_gap) / 2;

svg += `
<line
class="region-trend-zone-separator"
x1="${separator_x}"
y1="${top - 18}"
x2="${separator_x}"
y2="${top + plot_height + 10}"
/>
`;

}

}
);

svg += `
</svg>
`;

/* -------------------------------------------------------
   RENDER
   ------------------------------------------------------- */

container.html(`
<div class="region-trend-card">

<div class="region-trend-title">
Region Wise BHSC
</div>

<div class="region-trend-subtitle">
${period_label
? `Region-wise score for ${period_label}`
: "Region-wise score comparison"}
</div>

<div class="region-trend-legend-top" style="display:flex;align-items:center;gap:22px;margin:0 0 10px;">
<div style="display:flex;align-items:center;gap:6px;color:#405c60;font-size:11px;font-weight:800;">
<span style="width:11px;height:11px;border-radius:2px;background:#3A6F75;display:inline-block;"></span>
<span>Current Month: ${period_label} (Bar)</span>
</div>
<div style="display:flex;align-items:center;gap:6px;color:#405c60;font-size:11px;font-weight:800;">
<span style="position:relative;width:24px;height:3px;border-radius:2px;background:#f59e0b;display:inline-block;">
<span style="position:absolute;left:50%;top:50%;width:7px;height:7px;margin:-3.5px 0 0 -3.5px;border-radius:50%;background:#f59e0b;border:1.5px solid #fff;"></span>
</span>
<span>Previous Month: ${periods && periods.length > 1 ? periods[periods.length - 2].label : ""} (Line)</span>
</div>
</div>

<div
class="region-trend-chart-wrap"
style="overflow-x:auto;"
>

<div
class="region-trend-chart"
style="width:${chart_width}px;"
>
<div style="position:sticky;left:0;z-index:3;width:${left}px;height:${chart_height}px;margin-bottom:-${chart_height}px;background:#fff;">
<svg width="${left}" height="${chart_height}" style="display:block;overflow:visible;">${axis_svg}</svg>
</div>
${svg}
</div>

</div>

<div
class="region-trend-tooltip"
id="region-trend-tooltip"
>
</div>

</div>
`);

/* -------------------------------------------------------
   TOOLTIP
   ------------------------------------------------------- */

container
.off(
"mouseenter.regionTrend",
".region-trend-bar"
)
.on(
"mouseenter.regionTrend",
".region-trend-bar",
function(){

let tooltip =
$("#region-trend-tooltip");

let text =
$(this).attr(
"data-tooltip"
);

tooltip
.text(text)
.show();

let offset =
$(this).position();

tooltip.css({
left:
(offset.left + 12) + "px",

top:
(offset.top - 42) + "px"
});

}
)
.off(
"mouseleave.regionTrend",
".region-trend-bar"
)
.on(
"mouseleave.regionTrend",
".region-trend-bar",
function(){

$("#region-trend-tooltip")
.hide();

}
);

}


function render_zone_wise_trend_graph(
periods,
zones,
data
){
let container=
$("#zone-wise-trend-graph");
if(!container.length){
return;
}
if(
!periods||
!periods.length||
!zones||
!zones.length
){
container.html(`
<div class="zone-trend-card">
<div class="zone-trend-title">
Zone Wise Monthly Comparison
</div>
<div class="zone-trend-empty">
No trend data available.
</div>
</div>
`);
return;
}
/* ---------------------------------------------------------
   GRAPH DIMENSIONS
   --------------------------------------------------------- */
let chart_width=
Math.max(
900,
periods.length*125
);
let chart_height=340;
let padding_left=58;
let padding_right=28;
let padding_top=25;
let padding_bottom=52;
let plot_width=
chart_width-
padding_left-
padding_right;
let plot_height=
chart_height-
padding_top-
padding_bottom;
/* ---------------------------------------------------------
   COLLECT VALUES
   --------------------------------------------------------- */
let all_values=[];
zones.forEach(zone=>{
let zone_data=
data[zone]||
{};
periods.forEach(period=>{
let key=
String(
period.label||
""
);
let cell_value=
zone_data[key];
let value = sahayog_cell_number(cell_value);
if(
value!==null&&
Number.isFinite(value)
){
all_values.push(value);
}
});
});
if(!all_values.length){
container.html(`
<div class="zone-trend-card">
<div class="zone-trend-title">
Zone Wise Monthly Comparison
</div>
<div class="zone-trend-empty">
No actual score data available for the selected period.
</div>
</div>
`);
return;
}
/* ---------------------------------------------------------
   Y AXIS
   --------------------------------------------------------- */
let data_min=
Math.min(
0,
...all_values
);
let data_max=
Math.max(
100,
...all_values
);
let y_min=
Math.floor(
data_min/10
)*10;
let y_max=
Math.ceil(
data_max/10
)*10;
if(y_max<=y_min){
y_max=y_min+100;
}
let y_range=
y_max-y_min;
/* ---------------------------------------------------------
   COORDINATE HELPERS
   --------------------------------------------------------- */
function get_x(index){
if(periods.length===1){
return padding_left+
(plot_width/2);
}
return padding_left+
(
index/
(periods.length-1)
)*
plot_width;
}
function get_y(value){
return padding_top+
(
(y_max-value)/
y_range
)*
plot_height;
}
/* ---------------------------------------------------------
   SMOOTH BEZIER PATH
   --------------------------------------------------------- */
function create_smooth_path(points){
if(!points.length){
return"";
}
if(points.length===1){
return`
M ${points[0].x} ${points[0].y}
`;
}
let path=
`M ${points[0].x} ${points[0].y}`;
for(
let i=0;
i<points.length-1;
i++
){
let current=
points[i];
let next=
points[i+1];
let control_distance=
(next.x-current.x)/2;
let cp1_x=
current.x+
control_distance;
let cp1_y=
current.y;
let cp2_x=
next.x-
control_distance;
let cp2_y=
next.y;
path+=
` C ${cp1_x} ${cp1_y}, ${cp2_x} ${cp2_y}, ${next.x} ${next.y}`;
}
return path;
}
/* ---------------------------------------------------------
   Y AXIS GRID
   --------------------------------------------------------- */
let grid_html="";
let y_step=
Math.max(
10,
Math.ceil(
y_range/5/10
)*10
);
let y_values=[];
for(
let value=y_max;
value>=y_min;
value-=y_step
){
y_values.push(value);
}
if(
y_values[y_values.length-1]!==y_min
){
y_values.push(y_min);
}
y_values.forEach(value=>{
let y=
get_y(value);
grid_html+=`
<line
x1="${padding_left}"
y1="${y}"
x2="${chart_width-padding_right}"
y2="${y}"
class="zone-trend-grid-line">
</line>
<text
x="${padding_left-10}"
y="${y+4}"
text-anchor="end"
class="zone-trend-axis-label">
${value}
</text>
`;
});
/* ---------------------------------------------------------
   X AXIS
   --------------------------------------------------------- */
let x_labels_html="";
periods.forEach(
(period,index)=>{
let x=
get_x(index);
x_labels_html+=`
<text
x="${x}"
y="${chart_height-padding_bottom+27}"
text-anchor="middle"
class="zone-trend-axis-label">
${frappe.utils.escape_html(
String(period.label||"")
)}
</text>
`;
});
/* ---------------------------------------------------------
   PROFESSIONAL ZONE COLORS
   --------------------------------------------------------- */
let zone_colors=[
"#B86F73", // Soft Rose
"#4F8F8F", // Soft Teal
"#806FA8", // Soft Purple
"#C4864E", // Soft Orange
"#668F70", // Soft Green
"#7189B0", // Soft Blue
"#A96F8C", // Soft Pink
"#829457", // Soft Olive
"#8F7568", // Soft Brown
"#667C83", // Soft Slate
"#7465A0", // Soft Indigo
"#4F9296", // Soft Cyan
"#B56F52", // Soft Terracotta
"#8F8D55", // Soft Mustard
"#7B6AA8", // Soft Violet
"#518477", // Soft Sea Green
"#9D6F91", // Soft Mauve
"#687BA8", // Soft Periwinkle
"#8F8F58", // Soft Khaki
"#61767D"  // Soft Charcoal
];
/* ---------------------------------------------------------
   LINES + AREAS + POINTS + LEGEND
   --------------------------------------------------------- */
let lines_html="";
let legend_html="";
zones.forEach(
(zone,zone_index)=>{
let zone_data=
data[zone]||
{};
let points=[];
let valid_points=[];
periods.forEach(
(period,period_index)=>{
let key=
String(
period.label||
""
);
let cell_value=
zone_data[key];
let value = sahayog_cell_number(cell_value);
if(
value!==null&&
Number.isFinite(value)
){
let x=
get_x(period_index);
let y=
get_y(value);
points.push({
x:x,
y:y
});
valid_points.push({
x:x,
y:y,
value:value,
period:String(
period.label||
""
)
});
}
});
/* -------------------------------------------------------
   DRAW ONLY IF DATA EXISTS
   ------------------------------------------------------- */
if(!points.length){
return;
}
let color=
zone_colors[
zone_index%
zone_colors.length
];
/* -------------------------------------------------------
   SMOOTH LINE
   ------------------------------------------------------- */
let smooth_path=
create_smooth_path(
points
);
lines_html+=`
<path
d="${smooth_path}"
class="zone-trend-line"
stroke="${color}">
</path>
`;
/* -------------------------------------------------------
   SUBTLE AREA UNDER CURVE
   ------------------------------------------------------- */
if(points.length>1){
let area_path=
smooth_path+
` L ${points[points.length-1].x} ${padding_top+plot_height}`+
` L ${points[0].x} ${padding_top+plot_height}`+
` Z`;
lines_html+=`
<path
d="${area_path}"
class="zone-trend-area"
fill="${color}">
</path>
`;
}
/* -------------------------------------------------------
   POINTS
   ------------------------------------------------------- */
valid_points.forEach(point=>{
let safe_zone=
frappe.utils.escape_html(
String(zone)
);
let safe_period=
frappe.utils.escape_html(
String(point.period)
);
let tooltip_text=
`${safe_zone} — ${safe_period}: ${point.value.toFixed(2)}`;
lines_html+=`
<circle
cx="${point.x}"
cy="${point.y}"
r="4.5"
class="zone-trend-point"
fill="${color}"
data-tooltip="${frappe.utils.escape_html(
tooltip_text
)}"
data-zone="${safe_zone}"
data-period="${safe_period}"
data-value="${point.value.toFixed(2)}">
</circle>
`;
});
/* -------------------------------------------------------
   LEGEND
   ------------------------------------------------------- */
legend_html+=`
<div class="zone-trend-legend-item">
<span
class="zone-trend-legend-line"
style="
background:${color};
">
</span>
<span>
${frappe.utils.escape_html(
String(zone)
)}
</span>
</div>
`;
});
/* ---------------------------------------------------------
   SVG
   --------------------------------------------------------- */
let svg_html=`
<svg
class="zone-trend-svg"
viewBox="0 0 ${chart_width} ${chart_height}"
preserveAspectRatio="none">
${grid_html}
<line
x1="${padding_left}"
y1="${padding_top}"
x2="${padding_left}"
y2="${chart_height-padding_bottom}"
class="zone-trend-axis-line">
</line>
<line
x1="${padding_left}"
y1="${chart_height-padding_bottom}"
x2="${chart_width-padding_right}"
y2="${chart_height-padding_bottom}"
class="zone-trend-axis-line">
</line>
${x_labels_html}
${lines_html}
</svg>
`;
/* ---------------------------------------------------------
   HTML
   --------------------------------------------------------- */
container.html(`
<div class="zone-trend-card">
<div class="zone-trend-title">
Zone Wise BHSC Monthly Comparison
</div>
<div class="zone-trend-subtitle">
Month-wise comparison of average BHSC score for all zones based on Branch Score Card records.
</div>
<div class="zone-trend-chart-wrap">
<div
class="zone-trend-chart"
style="width:${chart_width}px;">
${svg_html}
<div class="zone-trend-tooltip">
<div class="zone-trend-tooltip-title">
</div>
<div class="zone-trend-tooltip-value">
</div>
</div>
</div>
</div>
<div class="zone-trend-legend">
${legend_html}
</div>
</div>
`);
/* ---------------------------------------------------------
   TOOLTIP
   --------------------------------------------------------- */
container
.find(".zone-trend-point")
.on(
"mouseenter",
function(){
let point=
$(this);
let zone=
point.attr(
"data-zone"
)||
"";
let period=
point.attr(
"data-period"
)||
"";
let value=
point.attr(
"data-value"
)||
"";
let tooltip=
container.find(
".zone-trend-tooltip"
);
tooltip.find(
".zone-trend-tooltip-title"
).text(
zone+
" — "+
period
);
tooltip.find(
".zone-trend-tooltip-value"
).text(
"Average Score: "+
value
);
let chart=
container.find(
".zone-trend-chart"
);
let point_x=
parseFloat(
point.attr("cx")
);
let point_y=
parseFloat(
point.attr("cy")
);
let tooltip_width=
tooltip.outerWidth()||
170;
let chart_width_actual=
chart.innerWidth();
let left=
point_x-
(tooltip_width/2);
left=
Math.max(
8,
Math.min(
left,
chart_width_actual-
tooltip_width-
8
)
);
let top=
point_y-
82;
top=
Math.max(
8,
top
);
tooltip.css({
display:"block",
left:left+"px",
top:top+"px"
});
})
.on(
"mouseleave",
function(){
container
.find(".zone-trend-tooltip")
.hide();
});
}
/* =========================================================
   ZONE WISE TREND COMPARISON TABLE
   ========================================================= */
function render_zone_wise_trend_comparison(
    trend_result
){
    let container=
        $("#zone-wise-trend-comparison");
    if(!container.length){
        return;
    }
    if(
        !trend_result||
        trend_result.available!==true
    ){
        let message=
            trend_result&&
            trend_result.message
            ?String(trend_result.message)
            :"No comparison data available.";
        container.html(`
            <div class="zone-comparison-card">
                <div class="zone-comparison-empty">
                    <div class="zone-comparison-empty-title">
                        Trend Comparison Not Available
                    </div>
                    <div>
                        ${frappe.utils.escape_html(
                            message
                        )}
                    </div>
                </div>
            </div>
        `);
        return;
    }
    let zones=
        Array.isArray(trend_result.zones)
        ?trend_result.zones
        :[];
    let data=
        trend_result.data||
        {};
    let grand_total=
        trend_result.grand_total||
        {};
    let selected_label=
        String(
            trend_result.selected_label||
            ""
        );
    let previous_label=
        String(
            trend_result.previous_label||
            ""
        );
    if(!zones.length){
        container.html(`
            <div class="zone-comparison-card">
                <div class="zone-comparison-empty">
                    <div class="zone-comparison-empty-title">
                        No Zone Data Available
                    </div>
                    <div>
                        No valid zone comparison data was found.
                    </div>
                </div>
            </div>
        `);
        return;
    }
    let rows_html="";
    zones.forEach(function(zone){
        let zone_data=
            data[zone]||
            {};
        let constant=
            Number(
                zone_data.constant
            )||0;
        let down=
            Number(
                zone_data.down
            )||0;
        let up=
            Number(
                zone_data.up
            )||0;
        let total=
            Number(
                zone_data.grand_total
            )||0;
        rows_html+=`
            <tr>
                <td>
                    <div class="zone-comparison-zone-name">
                        <span
                            class="zone-comparison-zone-dot">
                        </span>
                        <span>
                            ${frappe.utils.escape_html(
                                String(zone)
                            )}
                        </span>
                    </div>
                </td>
                <td>
                    <span
                        class="zone-comparison-value zone-comparison-constant">
                        ${constant}
                    </span>
                </td>
                <td>
                    <span
                        class="zone-comparison-value zone-comparison-down">
                        ${down}
                    </span>
                </td>
                <td>
                    <span
                        class="zone-comparison-value zone-comparison-up">
                        ${up}
                    </span>
                </td>
                <td>
                    <span
                        class="zone-comparison-value zone-comparison-total">
                        ${total}
                    </span>
                </td>
            </tr>
        `;
    });
    let total_constant=
        Number(
            grand_total.constant
        )||0;
    let total_down=
        Number(
            grand_total.down
        )||0;
    let total_up=
        Number(
            grand_total.up
        )||0;
    let total_grand=
        Number(
            grand_total.grand_total
        )||0;
    rows_html+=`
        <tr class="grand-total-row">
            <td>
                Grand Total
            </td>
            <td>
                <span
                    class="zone-comparison-value zone-comparison-constant">
                    ${total_constant}
                </span>
            </td>
            <td>
                <span
                    class="zone-comparison-value zone-comparison-down">
                    ${total_down}
                </span>
            </td>
            <td>
                <span
                    class="zone-comparison-value zone-comparison-up">
                    ${total_up}
                </span>
            </td>
            <td>
                <span
                    class="zone-comparison-value zone-comparison-total">
                    ${total_grand}
                </span>
            </td>
        </tr>
    `;

}
/* =========================================================
   ZONE WISE - RENDER BACKEND RESULT
   ========================================================= */
function render_zone_wise_table(
result
){
    let container = $("#zone-wise-content");

    const format_score = (value) => {
        const n = Number(value);
        return Number.isFinite(n) ? n.toFixed(2) : "—";
    };

    if(!container.length){
        return;
    }

    let periods = Array.isArray(result.periods) ? result.periods : [];
    let zones = Array.isArray(result.zones) ? result.zones : [];
    let data = result.data || {};
    let grand_total = result.grand_total || {};

    if(!periods.length){
        container.html(`
            <div class="zws-empty">
                <div class="zws-empty-title">No Trend Period Available</div>
                <div>No valid months are available for the selected FY.</div>
            </div>
        `);
        return;
    }

    if(!zones.length){
        container.html(`
            <div class="zws-empty">
                <div class="zws-empty-title">No Zone Data Available</div>
                <div>No actual zone mapping was found in Sahayog Branch.</div>
            </div>
        `);
        return;
    }

    const target = 95;
    const latest_period = periods[periods.length - 1] || {};
    const latest_label = String(latest_period.label || "");
    const previous_period = periods.length > 1
        ? periods[periods.length - 2]
        : null;
    const previous_label = previous_period
        ? String(previous_period.label || "")
        : "";

    function getValue(zone, period){
        let zone_data = data[zone] || {};
        let cell = zone_data[String(period.label || "")];
        return sahayog_cell_number(cell);
    }

    function getBranchCount(zone, period){
        let zone_data = data[zone] || {};
        let cell = zone_data[String(period.label || "")];

        if(cell && typeof cell === "object"){
            let count = Number(cell.branch_count);
            return Number.isFinite(count) ? count : 0;
        }

        return 0;
    }

    function safe(value){
        return frappe.utils.escape_html(String(value ?? ""));
    }

    let latest_values = zones
        .map(zone => ({
            zone: zone,
            value: getValue(zone, latest_period)
        }))
        .filter(item => item.value !== null && Number.isFinite(item.value));

    let current_total = sahayog_cell_number(grand_total[latest_label]);

    if(current_total === null && latest_values.length){
        current_total =
            latest_values.reduce((sum, item) => sum + item.value, 0) /
            latest_values.length;
    }

    let previous_total = previous_label
        ? sahayog_cell_number(grand_total[previous_label])
        : null;

    let best_zone = latest_values.length
        ? latest_values.reduce((a,b) => a.value > b.value ? a : b)
        : null;

    let lowest_zone = latest_values.length
        ? latest_values.reduce((a,b) => a.value < b.value ? a : b)
        : null;

    let target_count = latest_values.filter(
        item => item.value >= target
    ).length;

    let coverage_count = 0;
    zones.forEach(zone => {
        if(getBranchCount(zone, latest_period) > 0){
            coverage_count++;
        }
    });

    let coverage_pct = zones.length
        ? (coverage_count / zones.length) * 100
        : 0;

    let delta = (
        current_total !== null &&
        previous_total !== null
    )
        ? current_total - previous_total
        : null;

    let delta_html = "";

    if(delta !== null){
        if(Math.abs(delta) < 0.005){
            delta_html = `
                <span class="zws-delta zws-delta-flat">
                    → 0.00
                </span>
            `;
        }else if(delta > 0){
            delta_html = `
                <span class="zws-delta zws-delta-up">
                    ↑ ${delta.toFixed(2)}
                </span>
            `;
        }else{
            delta_html = `
                <span class="zws-delta zws-delta-down">
                    ↓ ${Math.abs(delta).toFixed(2)}
                </span>
            `;
        }
    }

    /* =====================================================
       TABLE
       ===================================================== */

    function zone_status_class(value){
        if(value === null || !Number.isFinite(Number(value))){
            return "zws-cell-none";
        }

        let score = Number(value);

        if(score >= target){
            return "zws-cell-good";
        }

        if(score >= target - 5){
            return "zws-cell-warning";
        }

        return "zws-cell-danger";
    }

    function zone_coverage(period){
        let count = zones.filter(zone => {
            return getValue(zone, period) !== null;
        }).length;

        return count;
    }

    let table_head = periods.map((period, period_index) => {

        let coverage = zone_coverage(period);

        let selected_class =
            period_index === periods.length - 1
            ? " zws-period-selected"
            : "";

        return `
            <th class="${selected_class}">
                <span class="zws-period-label">
                    ${safe(period.label || "")}
                </span>
                <small>
                    ${
                        coverage
                        ? `${coverage}/${zones.length} zones`
                        : "no data"
                    }
                </small>
            </th>
        `;
    }).join("");

    let table_rows = zones.map(zone => {

        let cells = periods.map((period, period_index) => {

            let value = getValue(zone, period);

            let selected_class =
                period_index === periods.length - 1
                ? " zws-period-selected"
                : "";

            if(value === null){
                return `
                    <td class="zws-score-cell zws-cell-none${selected_class}">
                        <span class="zws-score zws-no-data">—</span>
                    </td>
                `;
            }

            let diff = "";

            if(
                period_index === periods.length - 1 &&
                period_index > 0
            ){
                let previous =
                    getValue(
                        zone,
                        periods[period_index - 1]
                    );

                if(previous !== null){

                    let d = value - previous;

                    if(Math.abs(d) < 0.005){

                        diff = `
                            <small class="zws-cell-flat">
                                → 0.00
                            </small>
                        `;

                    }else if(d > 0){

                        diff = `
                            <small class="zws-cell-up">
                                ↑ ${d.toFixed(2)}
                            </small>
                        `;

                    }else{

                        diff = `
                            <small class="zws-cell-down">
                                ↓ ${Math.abs(d).toFixed(2)}
                            </small>
                        `;
                    }
                }
            }

            return `
                <td class="zws-score-cell ${zone_status_class(value)}${selected_class}">
                    <span class="zws-score">
                        ${value.toFixed(2)}
                    </span>
                    ${diff}
                </td>
            `;

        }).join("");

        return `
            <tr>
                <td class="zws-zone-name">
                    ${safe(zone)}
                </td>
                ${cells}
            </tr>
        `;

    }).join("");

    /* =====================================================
       RANKING
       ===================================================== */

    let ranking = latest_values
        .slice()
        .sort((a,b) => b.value - a.value);

    let ranking_html = ranking.map((item, index) => {

        let width = Math.max(
            4,
            Math.min(100, item.value)
        );

        let performance_class =
            item.value >= 85
                ? "zws-performance-good"
                : item.value >= 65
                    ? "zws-performance-average"
                    : "zws-performance-low";

        return `
            <div class="zws-rank-row">
                <div class="zws-rank-number">${index + 1}</div>

                <div class="zws-rank-main">
                    <div class="zws-rank-label">
                        <span>${safe(item.zone)}</span>
                        <strong>${item.value.toFixed(2)}</strong>
                    </div>

                    <div class="zws-rank-track">
                        <div
                            class="zws-rank-bar ${performance_class}"
                            style="width:${width}%;">
                        </div>

                    </div>
                </div>
            </div>
        `;
    }).join("");

    /* =====================================================
       TREND CHART
       ===================================================== */

    let chart_width = Math.max(
        820,
        periods.length * 115
    );

    let chart_height = 310;
    let left = 48;
    let right = 25;
    let top = 25;
    let bottom = 48;

    let plot_width = chart_width - left - right;
    let plot_height = chart_height - top - bottom;

    let all_values = [];

    zones.forEach(zone => {
        periods.forEach(period => {
            let value = getValue(zone, period);

            if(value !== null){
                all_values.push(value);
            }
        });
    });

    all_values.push(target);

    let min_value = Math.min(0, ...all_values);
    let max_value = Math.max(100, ...all_values);

    let y_min = Math.floor(min_value / 10) * 10;
    let y_max = Math.ceil(max_value / 10) * 10;

    if(y_max <= y_min){
        y_max = y_min + 100;
    }

    function chartX(index){
        if(periods.length === 1){
            return left + plot_width / 2;
        }

        return left +
            (index / (periods.length - 1)) *
            plot_width;
    }

    function chartY(value){
        return top +
            ((y_max - value) / (y_max - y_min)) *
            plot_height;
    }

    let grid_html = "";

    for(let value = y_max; value >= y_min; value -= 20){

        let y = chartY(value);

        grid_html += `
            <line
                x1="${left}"
                y1="${y}"
                x2="${chart_width-right}"
                y2="${y}"
                class="zws-grid">
            </line>

            <text
                x="${left-9}"
                y="${y+4}"
                text-anchor="end"
                class="zws-axis-label">
                ${value}
            </text>
        `;
    }

    let x_labels = periods.map((period,index) => `
        <text
            x="${chartX(index)}"
            y="${chart_height-bottom+25}"
            text-anchor="middle"
            class="zws-axis-label">
            ${safe(period.label || "")}
        </text>
    `).join("");

    let zone_colors = [
        "#3A6F75",
        "#806FA8",
        "#C4864E",
        "#668F70",
        "#7189B0",
        "#B86F73",
        "#829457",
        "#8F7568"
    ];

    let chart_lines = "";

    zones.forEach((zone, zone_index) => {

        let points = [];

        periods.forEach((period,index) => {
            let value = getValue(zone, period);

            if(value !== null){
                points.push({
                    x: chartX(index),
                    y: chartY(value),
                    value: value
                });
            }
        });

        if(!points.length){
            return;
        }

        let color =
            zone_colors[zone_index % zone_colors.length];

        let path = `M ${points[0].x} ${points[0].y}`;

        for(let i = 1; i < points.length; i++){
            let previous = points[i-1];
            let current = points[i];

            let mid =
                (previous.x + current.x) / 2;

            path +=
                ` C ${mid} ${previous.y}, ` +
                `${mid} ${current.y}, ` +
                `${current.x} ${current.y}`;
        }

        chart_lines += `
            <path
                d="${path}"
                class="zws-chart-line"
                stroke="${color}">
            </path>
        `;

        points.forEach(point => {
            chart_lines += `
                <circle
                    cx="${point.x}"
                    cy="${point.y}"
                    r="4"
                    fill="${color}"
                    class="zws-chart-point">
                    <title>
                        ${safe(zone)}: ${point.value.toFixed(2)}
                    </title>
                </circle>
            `;
        });
    });

    let trend_legend = zones.map((zone, index) => `
        <span class="zws-legend-item">
            <span
                class="zws-legend-dot"
                style="background:${zone_colors[index % zone_colors.length]}">
            </span>
            ${safe(zone)}
        </span>
    `).join("");

    /* =====================================================
       MAIN DASHBOARD
       ===================================================== */

    container.html(`
        <div class="zws-dashboard">

            <div class="zws-header">
                <div>
                    <div class="zws-heading">
                        Zone Wise Performance
                    </div>

                    <div class="zws-subheading">
                        Real-time Zone-wise Branch Score Card performance
                    </div>
                </div>
            </div>

            <div class="zws-hero-grid">

                <div class="zws-gauge-card">

                    <div class="zws-card-label">
                        GRAND TOTAL
                    </div>

                    <div class="zws-gauge">
                        <svg
                            viewBox="0 0 220 145"
                            class="zws-gauge-svg">

                            <path
                                d="M 25 110 A 85 85 0 0 1 195 110"
                                class="zws-gauge-bg">
                            </path>

                            <path
                                d="M 25 110 A 85 85 0 0 1 195 110"
                                class="zws-gauge-value"
                                pathLength="100"
                                style="stroke-dasharray:${Math.min(
                                    100,
                                    Math.max(0, current_total || 0)
                                )} 100;">
                            </path>

                            ${[0,25,50,75,100].map(score => {
                                const angle = Math.PI - (score / 100) * Math.PI;
                                const outer_x = 110 + 91 * Math.cos(angle);
                                const outer_y = 110 - 91 * Math.sin(angle);
                                const inner_x = 110 + 80 * Math.cos(angle);
                                const inner_y = 110 - 80 * Math.sin(angle);
                                const label_x = 110 + 103 * Math.cos(angle);
                                const label_y = 110 - 103 * Math.sin(angle);

                                return `
                                    <line
                                        x1="${outer_x.toFixed(2)}"
                                        y1="${outer_y.toFixed(2)}"
                                        x2="${inner_x.toFixed(2)}"
                                        y2="${inner_y.toFixed(2)}"
                                        class="zws-gauge-tick">
                                    </line>

                                    <text
                                        x="${label_x.toFixed(2)}"
                                        y="${(label_y + 3).toFixed(2)}"
                                        class="zws-gauge-scale-label"
                                        text-anchor="middle">
                                        ${score}
                                    </text>
                                `;
                            }).join("")}

                            ${current_total !== null ? (() => {
                                const score = Math.min(
                                    100,
                                    Math.max(0, Number(current_total) || 0)
                                );
                                const angle = Math.PI - (score / 100) * Math.PI;

                                const point_x = 110 + 85 * Math.cos(angle);
                                const point_y = 110 - 85 * Math.sin(angle);

                                return `
                                    <circle
                                        cx="${point_x.toFixed(2)}"
                                        cy="${point_y.toFixed(2)}"
                                        r="5"
                                        class="zws-gauge-point">
                                    </circle>
                                `;
                            })() : ""}
                        </svg>

                        <div class="zws-gauge-value-text">
                            ${current_total !== null
                                ? current_total.toFixed(2)
                                : "—"}
                        </div>

                        <div class="zws-gauge-caption">
                            Average Score
                        </div>
                    </div>

                    ${delta_html}
                </div>

                <div class="zws-section-card zws-hero-ranking-card">

                    <div class="zws-section-header">
                        <div>
                            <div class="zws-section-title">
                                Zone Ranking
                            </div>

                            <div class="zws-section-subtitle">
                                Current month performance
                            </div>
                        </div>
                    </div>

                    <div class="zws-ranking">
                        ${ranking_html || `
                            <div class="zws-empty-inline">
                                No current month score data available.
                            </div>
                        `}
                    </div>

                </div>

                <div class="zws-section-card zws-grand-trend-card">

                    <div class="zws-section-header">
                        <div>
                            <div class="zws-section-title">
                                Grand Total Trend
                            </div>

                            <div class="zws-section-subtitle">
                                Monthly average score
                            </div>
                        </div>
                    </div>

                    ${(() => {
                        const trend_points = periods
                            .map((period) => {
                                const value = sahayog_cell_number(
                                    grand_total[period.label]
                                );

                                return Number.isFinite(value)
                                    ? {
                                        label: String(period.label || ""),
                                        value
                                    }
                                    : null;
                            })
                            .filter(Boolean);

                        const latest = trend_points.length
                            ? trend_points[trend_points.length - 1]
                            : null;

                        const previous = trend_points.length > 1
                            ? trend_points[trend_points.length - 2]
                            : null;

                        const change = latest && previous
                            ? latest.value - previous.value
                            : null;

                        const direction = change === null
                            ? "constant"
                            : change > 0
                                ? "up"
                                : change < 0
                                    ? "down"
                                    : "constant";

                        const direction_icon = direction === "up"
                            ? "↑"
                            : direction === "down"
                                ? "↓"
                                : "—";

                        const direction_text = direction === "up"
                            ? "Improved"
                            : direction === "down"
                                ? "Declined"
                                : "No Change";

                        const chart_width = 240;
                        const chart_height = 78;
                        const chart_left = 8;
                        const chart_right = 8;
                        const chart_top = 8;
                        const chart_bottom = 8;

                        let chart_html = "";

                        if (trend_points.length) {
                            const values = trend_points.map(item => item.value);
                            const min_value = Math.min(...values);
                            const max_value = Math.max(...values);
                            const range = Math.max(
                                1,
                                max_value - min_value
                            );

                            const points = trend_points.map((item, index) => {
                                const x = trend_points.length === 1
                                    ? chart_width / 2
                                    : chart_left +
                                      (
                                          index /
                                          (trend_points.length - 1)
                                      ) *
                                      (
                                          chart_width -
                                          chart_left -
                                          chart_right
                                      );

                                const y = chart_top +
                                    (
                                        (max_value - item.value) /
                                        range
                                    ) *
                                    (
                                        chart_height -
                                        chart_top -
                                        chart_bottom
                                    );

                                return {
                                    x,
                                    y,
                                    label: item.label,
                                    value: item.value
                                };
                            });

                            const line_points = points
                                .map(point =>
                                    `${point.x.toFixed(2)},${point.y.toFixed(2)}`
                                )
                                .join(" ");

                            chart_html = `
                                <svg
                                    viewBox="0 0 ${chart_width} ${chart_height}"
                                    class="zws-grand-trend-svg"
                                    preserveAspectRatio="none">

                                    <polyline
                                        points="${line_points}"
                                        class="zws-grand-trend-line">
                                    </polyline>

                                    ${points.map(point => `
                                        <circle
                                            cx="${point.x.toFixed(2)}"
                                            cy="${point.y.toFixed(2)}"
                                            r="3"
                                            class="zws-grand-trend-point">
                                        </circle>
                                    `).join("")}
                                </svg>
                            `;
                        } else {
                            chart_html = `
                                <div class="zws-grand-trend-no-data">
                                    No trend data available.
                                </div>
                            `;
                        }

                        return `
                            <div class="zws-grand-trend-summary">

                                <div class="zws-grand-trend-current">
                                    <span>Current</span>
                                    <strong>
                                        ${latest
                                            ? latest.value.toFixed(2)
                                            : "—"}
                                    </strong>
                                </div>

                                <div class="zws-grand-trend-change zws-grand-trend-${direction}">
                                    <span class="zws-grand-trend-arrow">
                                        ${direction_icon}
                                    </span>

                                    <span>
                                        ${
                                            change === null
                                                ? direction_text
                                                : `${direction_text} ${Math.abs(change).toFixed(2)}`
                                        }
                                    </span>
                                </div>

                            </div>

                            <div class="zws-grand-trend-chart">
                                ${chart_html}
                            </div>

                            <div class="zws-grand-trend-months">
                                ${trend_points.map(item => `
                                    <div class="zws-grand-trend-month">
                                        <span>${safe(item.label)}</span>
                                        <strong>${item.value.toFixed(2)}</strong>
                                    </div>
                                `).join("")}
                            </div>
                        `;
                    })()}

                </div>

            </div>

            <div class="zws-section-card">

                <div class="zws-section-header">
                    <div>
                        <div class="zws-section-title">
                            Zone-wise Average Score
                        </div>

                        <div class="zws-section-subtitle">
                            Monthly average score and month-over-month movement
                        </div>
                    </div>
                </div>

                <div class="zws-table-wrap">
                    <table class="zws-table">

                        <thead>
                            <tr>
                                <th>Zone</th>
                                ${table_head}
                            </tr>
                        </thead>

                        <tbody>
                            ${table_rows}
                            <tr class="zws-grand-total-row">
                                <td class="zws-grand-total-label">Grand Total</td>
                                ${periods.map((period) => {
                                    const raw = grand_total[period.label];
                                    const value = sahayog_cell_number(raw);
                                    const has_value = Number.isFinite(value);

                                    return `
                                        <td class="zws-grand-total-cell">
                                            ${
                                                has_value
                                                    ? format_score(value)
                                                    : "—"
                                            }
                                        </td>
                                    `;
                                }).join("")}
                            </tr>
                        </tbody>
                    </table>
                </div>

            </div>

            <div class="zws-section-card">

                <div class="zws-section-header">
                    <div>
                        <div class="zws-section-title">
                            Zone Trend
                        </div>

                        <div class="zws-section-subtitle">
                            Real-time monthly score trend by zone
                        </div>
                    </div>


                </div>

                <div class="zws-chart-scroll">
                    <div
                        class="zws-chart"
                        style="width:${chart_width}px;">

                        <svg
                            viewBox="0 0 ${chart_width} ${chart_height}"
                            preserveAspectRatio="none">

                            ${grid_html}

                            <line
                                x1="${left}"
                                y1="${top}"
                                x2="${left}"
                                y2="${chart_height-bottom}"
                                class="zws-axis">
                            </line>

                            <line
                                x1="${left}"
                                y1="${chart_height-bottom}"
                                x2="${chart_width-right}"
                                y2="${chart_height-bottom}"
                                class="zws-axis">
                            </line>

                            ${x_labels}
                            ${chart_lines}

                        </svg>
                    </div>
                </div>

                <div class="zws-legend">
                    ${trend_legend}
                </div>

            </div>

        </div>
    `);

    /* =====================================================
       SCOPED ZONE WISE STYLES
       ===================================================== */






    sahayog_inject_style("zone-wise-modern-dashboard", `

        #zone-wise-content{
            width:100%;
        }

        #zone-wise-content .zws-dashboard{
            width:100%;
            padding:2px 0 28px;
            color:#17383c;
        }

        #zone-wise-content .zws-header{
            display:flex;
            align-items:center;
            justify-content:space-between;
            gap:18px;
            padding:18px 20px;
            margin-bottom:14px;
            border:1px solid #d7e3e5;
            border-radius:14px;
            background:#fff;
            box-shadow:0 2px 8px rgba(25,55,60,.045);
        }

        #zone-wise-content .zws-heading{
            font-size:19px;
            font-weight:900;
            color:#234f54;
            line-height:1.3;
        }

        #zone-wise-content .zws-subheading{
            margin-top:5px;
            font-size:11px;
            font-weight:600;
            color:#718589;
        }

        #zone-wise-content .zws-header-meta{
            display:flex;
            gap:8px;
            align-items:center;
            flex-shrink:0;
        }

        #zone-wise-content .zws-period-badge,
        #zone-wise-content .zws-target-badge{
            padding:7px 12px;
            border-radius:999px;
            font-size:11px;
            font-weight:800;
            white-space:nowrap;
        }

        #zone-wise-content .zws-period-badge{
            background:#edf5f5;
            color:#2f6f77;
        }

        #zone-wise-content .zws-target-badge{
            background:#fff5df;
            color:#9a6500;
        }

        #zone-wise-content .zws-hero-grid{
            display:grid;
            grid-template-columns:1.35fr 1fr 1.35fr;
            gap:12px;
            margin-bottom:14px;
        }

        #zone-wise-content .zws-hero-ranking-card{
            min-width:0;
            overflow:hidden;
            display:flex;
            flex-direction:column;
            box-sizing:border-box;
        }

        #zone-wise-content .zws-hero-ranking-card .zws-section-header{
            flex:0 0 auto;
            margin-bottom:10px;
        }


        #zone-wise-content .zws-hero-ranking-card .zws-ranking{
            flex:1 1 auto;
            min-height:0;
            max-height:none;
            overflow-y:auto;
            overflow-x:hidden;
            padding:0 6px 2px 0;
        }

        #zone-wise-content .zws-gauge-card,
        #zone-wise-content .zws-stat-card{
            min-height:174px;
            padding:17px;
            border:1px solid #d7e3e5;
            border-radius:14px;
            background:#fff;
            box-shadow:0 2px 7px rgba(25,55,60,.035);
        }

        #zone-wise-content .zws-card-label,
        #zone-wise-content .zws-stat-title{
            color:#789095;
            font-size:10px;
            font-weight:900;
            letter-spacing:.8px;
        }

        #zone-wise-content .zws-hero-grid{
            align-items:stretch !important;
        }

        #zone-wise-content .zws-hero-grid > .zws-gauge-card,
        #zone-wise-content .zws-hero-grid > .zws-hero-ranking-card{
            height:230px !important;
            min-height:230px !important;
            max-height:230px !important;
            box-sizing:border-box !important;
            align-self:stretch !important;
        }

        #zone-wise-content .zws-hero-ranking-card{
            overflow:hidden !important;
            display:flex !important;
            flex-direction:column !important;
        }

        #zone-wise-content .zws-grand-trend-card{
            height:230px !important;
            min-height:230px !important;
            max-height:230px !important;
            padding:15px !important;
            box-sizing:border-box !important;
            overflow:hidden !important;
            display:flex !important;
            flex-direction:column !important;
            border:1px solid #d7e3e5;
            border-radius:14px;
            background:#fff;
            box-shadow:0 2px 7px rgba(25,55,60,.035);
        }

        #zone-wise-content .zws-grand-trend-card .zws-section-header{
            margin-bottom:7px !important;
        }

        #zone-wise-content .zws-grand-trend-summary{
            display:flex;
            align-items:center;
            justify-content:space-between;
            gap:10px;
            margin-bottom:4px;
        }

        #zone-wise-content .zws-grand-trend-current{
            display:flex;
            align-items:baseline;
            gap:6px;
        }

        #zone-wise-content .zws-grand-trend-current span{
            color:#526d71;
            font-size:9px;
            font-weight:850;
        }

        #zone-wise-content .zws-grand-trend-current strong{
            color:#245c63;
            font-size:20px;
            font-weight:950;
        }

        #zone-wise-content .zws-grand-trend-change{
            display:flex;
            align-items:center;
            gap:4px;
            font-size:9px;
            font-weight:850;
            white-space:nowrap;
        }

        #zone-wise-content .zws-grand-trend-arrow{
            font-size:15px;
            font-weight:950;
        }

        #zone-wise-content .zws-grand-trend-up{
            color:#4f9d69;
        }

        #zone-wise-content .zws-grand-trend-down{
            color:#d45b5b;
        }

        #zone-wise-content .zws-grand-trend-constant{
            color:#8a9699;
        }

        #zone-wise-content .zws-grand-trend-chart{
            width:100%;
            height:64px;
            min-height:64px;
            flex:0 0 64px;
            margin:2px 0 5px;
            border-radius:8px;
            background:#f7faf9;
            overflow:hidden;
        }

        #zone-wise-content .zws-grand-trend-svg{
            width:100%;
            height:100%;
            display:block;
        }

        #zone-wise-content .zws-grand-trend-line{
            fill:none;
            stroke:#4f8f96;
            stroke-width:2.5;
            stroke-linecap:round;
            stroke-linejoin:round;
        }

        #zone-wise-content .zws-grand-trend-point{
            fill:#fff;
            stroke:#4f8f96;
            stroke-width:2;
        }

        #zone-wise-content .zws-grand-trend-months{
            display:grid;
            grid-template-columns:repeat(3,minmax(0,1fr));
            gap:5px 8px;
            margin-top:4px;
            flex:1 1 auto;
            min-height:0;
            max-height:none;
            overflow-y:auto;
            overflow-x:hidden;
            padding:2px 4px 2px 0;
            box-sizing:border-box;
        }

        #zone-wise-content .zws-grand-trend-months::-webkit-scrollbar{
            width:4px;
        }

        #zone-wise-content .zws-grand-trend-months::-webkit-scrollbar-thumb{
            background:#c7d7d9;
            border-radius:99px;
        }

        #zone-wise-content .zws-grand-trend-months::-webkit-scrollbar-track{
            background:transparent;
        }

        #zone-wise-content .zws-grand-trend-month{
            display:flex;
            align-items:center;
            justify-content:space-between;
            gap:6px;
            min-width:0;
            min-height:20px;
            padding:4px 7px;
            border-radius:5px;
            background:#f4f8f8;
            box-sizing:border-box;
        }

        #zone-wise-content .zws-grand-trend-month span{
            min-width:0;
            overflow:hidden;
            text-overflow:ellipsis;
            white-space:nowrap;
            color:#819295;
            font-size:9px;
            font-weight:800;
        }

        #zone-wise-content .zws-grand-trend-month strong{
            color:#315f64;
            font-size:9px;
            font-weight:950;
        }

        #zone-wise-content .zws-grand-trend-no-data{
            display:flex;
            align-items:center;
            justify-content:center;
            height:100%;
            color:#9aa7a9;
            font-size:9px;
            font-weight:700;
        }


        #zone-wise-content .zws-hero-ranking-card .zws-section-header{
            flex:0 0 auto !important;
            margin-bottom:10px !important;
        }

        #zone-wise-content .zws-hero-ranking-card .zws-ranking{
            flex:1 1 auto !important;
            min-height:0 !important;
            max-height:none !important;
            overflow-y:auto !important;
            overflow-x:hidden !important;
            padding:0 6px 2px 0 !important;
        }

        #zone-wise-content .zws-gauge-card{
            border:1px solid #245c63;
            background:linear-gradient(180deg,#d7ebed 0%,#b9d9dc 100%);
            box-shadow:0 5px 16px rgba(36,92,99,.18);
        }

        #zone-wise-content .zws-gauge-card .zws-card-label{
            color:#174a50;
            font-weight:950;
        }

        #zone-wise-content .zws-gauge-card .zws-gauge-bg{
            stroke:#a7c8cc;
        }

        #zone-wise-content .zws-gauge-card .zws-gauge-value{
            stroke:#245c63;
        }

        #zone-wise-content .zws-gauge-card .zws-gauge-point{
            fill:#123f45;
            stroke:#ffffff;
        }

        #zone-wise-content .zws-gauge-card .zws-gauge-scale-label{
            fill:#245c63;
            font-weight:950;
        }

        #zone-wise-content .zws-gauge-card .zws-gauge-tick{
            stroke:#245c63;
            stroke-width:2.5;
        }

        #zone-wise-content .zws-gauge-card .zws-gauge-value-text{
            color:#123f45;
            font-weight:950;
        }

        #zone-wise-content .zws-gauge-card .zws-gauge-caption{
            color:#245c63;
            font-weight:850;
        }

        #zone-wise-content .zws-gauge{
            position:relative;
            height:170px;
            margin-top:4px;
            overflow:visible;
        }

        #zone-wise-content .zws-gauge-svg{
            width:100%;
            height:170px;
            overflow:visible;
            display:block;
        }

        #zone-wise-content .zws-gauge-bg{
            fill:none;
            stroke:#e7eeee;
            stroke-width:17;
            stroke-linecap:round;
        }

        #zone-wise-content .zws-gauge-value{
            fill:none;
            stroke:#3a6f75;
            stroke-width:17;
            stroke-linecap:round;
        }

        #zone-wise-content .zws-gauge-tick{
            stroke:#789095;
            stroke-width:2;
            stroke-linecap:round;
        }

        #zone-wise-content .zws-gauge-scale-label{
            fill:#6f8286;
            font-size:9px;
            font-weight:800;
        }

        #zone-wise-content .zws-gauge-point{
            fill:#234f54;
            stroke:#fff;
            stroke-width:2.5;
        }

        #zone-wise-content .zws-gauge-value-text{
            position:absolute;
            left:0;
            right:0;
            bottom:28px;
            text-align:center;
            color:#234f54;
            font-size:30px;
            font-weight:950;
            line-height:1;
        }

        #zone-wise-content .zws-gauge-caption{
            position:absolute;
            left:0;
            right:0;
            bottom:4px;
            text-align:center;
            color:#84969a;
            font-size:11px;
            font-weight:700;
        }

        #zone-wise-content .zws-delta{
            display:block;
            text-align:center;
            font-size:14px;
            font-weight:850;
        }

        #zone-wise-content .zws-delta-up,
        #zone-wise-content .zws-cell-up{
            color:#277247;
        }

        #zone-wise-content .zws-delta-down,
        #zone-wise-content .zws-cell-down{
            color:#b23c43;
        }

        #zone-wise-content .zws-delta-flat,
        #zone-wise-content .zws-cell-flat{
            color:#77898d;
        }

        #zone-wise-content .zws-stat-title{
            margin-bottom:7px;
            font-size:10px;
        }

        #zone-wise-content .zws-stat-value{
            min-height:0;
            color:#234f54;
            font-size:22px;
            font-weight:900;
            line-height:1.1;
        }

        #zone-wise-content .zws-stat-big{
            color:#234f54;
            font-size:27px;
            font-weight:950;
        }

        #zone-wise-content .zws-stat-big span{
            color:#93a3a6;
            font-size:13px;
            font-weight:700;
        }

        #zone-wise-content .zws-stat-sub{
            margin-top:4px;
            color:#839498;
            font-size:9px;
            font-weight:700;
        }


        #zone-wise-content .zws-section-card{
            margin-bottom:14px;
            padding:17px;
            border:1px solid #d7e3e5;
            border-radius:14px;
            background:#fff;
            box-shadow:0 2px 7px rgba(25,55,60,.035);
            width:100%;
            box-sizing:border-box;
            overflow:visible;
        }

        #zone-wise-content .zws-table-wrap{
            width:100%;
            max-width:100%;
            overflow-x:auto;
            overflow-y:visible;
            display:block;
            box-sizing:border-box;
        }

        #zone-wise-content .zws-table{
            width:100%;
            min-width:720px;
            border-collapse:collapse;
            table-layout:auto;
        }

        #zone-wise-content .zws-table th,
        #zone-wise-content .zws-table td{
            white-space:nowrap;
        }

        #zone-wise-content .zws-grand-total-row{
            display:table-row !important;
            visibility:visible !important;
            opacity:1 !important;
            background:#edf5f5;
            border-top:2px solid #3a6f75;
        }

        #zone-wise-content .zws-grand-total-row td{
            display:table-cell !important;
            visibility:visible !important;
            opacity:1 !important;
            padding:11px 10px;
            color:#234f54;
            font-weight:900;
        }

        #zone-wise-content .zws-grand-total-label{
            color:#234f54 !important;
            font-weight:950 !important;
        }

        #zone-wise-content .zws-grand-total-cell{
            text-align:center;
            font-weight:950 !important;
        }

        #zone-wise-content .zws-dashboard,
        #zone-wise-content .zws-header,
        #zone-wise-content .zws-hero-grid,
        #zone-wise-content .zws-section-card{
            box-sizing:border-box;
        }

        #zone-wise-content .zws-hero-grid{
            width:100%;
            min-width:0;
        }

        @media (max-width:1100px){
            #zone-wise-content .zws-hero-grid{
                grid-template-columns:repeat(2,minmax(0,1fr));
            }

            #zone-wise-content .zws-gauge-card{
                grid-column:span 2;
            }
        }

        @media (max-width:700px){
            #zone-wise-content .zws-header{
                align-items:flex-start;
                flex-direction:column;
            }

            #zone-wise-content .zws-header-meta{
                width:100%;
                flex-wrap:wrap;
            }

            #zone-wise-content .zws-hero-grid{
                grid-template-columns:1fr;
            }

            #zone-wise-content .zws-gauge-card{
                grid-column:auto;
            }

            #zone-wise-content .zws-section-card{
                padding:12px;
            }
        }

        #zone-wise-content .zws-section-header{
            display:flex;
            align-items:center;
            justify-content:space-between;
            gap:12px;
            margin-bottom:14px;
        }

        #zone-wise-content .zws-section-title{
            color:#234f54;
            font-size:15px;
            font-weight:900;
        }

        #zone-wise-content .zws-section-subtitle{
            margin-top:3px;
            color:#839498;
            font-size:10px;
            font-weight:650;
        }

        #zone-wise-content .zws-table-wrap{
            width:100%;
            overflow-x:auto;
            border:1px solid #d9e3e5;
            border-radius:9px;
        }

        #zone-wise-content .zws-table{
            width:100%;
            min-width:760px;
            border-collapse:collapse;
            background:#fff;
        }

        #zone-wise-content .zws-table th{
            padding:11px 13px;
            border-bottom:1px solid #d5e0e2;
            background:#edf4f5;
            color:#365f64;
            font-size:10px;
            font-weight:900;
            text-align:center;
            white-space:nowrap;
        }

        #zone-wise-content .zws-table th:first-child{
            position:sticky;
            left:0;
            z-index:2;
            text-align:left;
        }

        #zone-wise-content .zws-table td{
            padding:12px 13px;
            border-bottom:1px solid #edf1f2;
            color:#284e52;
            font-size:11px;
            font-weight:700;
            text-align:center;
            white-space:nowrap;
        }

        #zone-wise-content .zws-table td:first-child{
            position:sticky;
            left:0;
            z-index:1;
            background:#fff;
            text-align:left;
        }

        #zone-wise-content .zws-table tbody tr:hover td{
            background:#f8fbfb;
        }

        #zone-wise-content .zws-table tbody tr:hover td:first-child{
            background:#f8fbfb;
        }

        #zone-wise-content .zws-zone-name{
            color:#24545a!important;
            font-weight:900!important;
        }

        #zone-wise-content .zws-score{
            display:block;
            font-size:12px;
            font-weight:900;
        }

        #zone-wise-content .zws-no-data{
            color:#b3c0c3;
        }

        #zone-wise-content .zws-table small{
            display:block;
            margin-top:3px;
            font-size:9px;
            font-weight:800;
        }

        #zone-wise-content .zws-target-key{
            display:flex;
            align-items:center;
            gap:6px;
            color:#9a6500;
            font-size:10px;
            font-weight:850;
        }

        #zone-wise-content .zws-target-key span{
            width:20px;
            border-top:2px dashed #d39416;
        }

        #zone-wise-content .zws-chart-scroll{
            width:100%;
            overflow-x:auto;
            overflow-y:hidden;
            padding:8px 4px 10px;
            border-radius:12px;
            background:#f8fbfc;
        }

        #zone-wise-content .zws-chart{
            min-width:820px;
            height:340px;
        }

        #zone-wise-content .zws-chart svg{
            width:100%;
            height:340px;
            display:block;
            overflow:visible;
        }

        #zone-wise-content .zws-grid{
            stroke:#c8d8db;
            stroke-width:1.2;
            stroke-dasharray:4 4;
            opacity:1;
        }

        #zone-wise-content .zws-grid-vertical{
            stroke:#d5e1e3;
            stroke-width:1;
            stroke-dasharray:3 4;
            opacity:1;
        }

        #zone-wise-content .zws-axis{
            stroke:#58777d;
            stroke-width:1.6;
        }

        #zone-wise-content .zws-axis-label{
            fill:#294f56;
            font-size:11px;
            font-weight:900;
        }

        #zone-wise-content .zws-x-axis-label{
            fill:#294f56;
            font-size:11px;
            font-weight:900;
        }

        #zone-wise-content .zws-chart-line{
            fill:none;
            stroke-width:3.5;
            stroke-linecap:round;
            stroke-linejoin:round;
            vector-effect:non-scaling-stroke;
            filter:drop-shadow(0 1px 1px rgba(20,55,60,.18));
        }

        #zone-wise-content .zws-chart-point-ring{
            opacity:1;
            pointer-events:none;
        }

        #zone-wise-content .zws-chart-point{
            stroke:#ffffff;
            stroke-width:2;
            cursor:pointer;
        }

        #zone-wise-content .zws-chart-point:hover{
            stroke-width:3;
        }

        #zone-wise-content .zws-legend{
            display:flex;
            flex-wrap:wrap;
            gap:10px 20px;
            margin-top:12px;
            padding:4px 6px 2px;
        }

        #zone-wise-content .zws-legend-item{
            display:flex;
            align-items:center;
            gap:7px;
            color:#294f56;
            font-size:11px;
            font-weight:900;
        }

        #zone-wise-content .zws-legend-dot{
            width:11px;
            height:11px;
            border-radius:50%;
            box-shadow:0 0 0 2px #ffffff, 0 0 0 3px #a9c0c4;
        }

        #zone-wise-content .zws-ranking{
            display:flex;
            flex-direction:column;
            gap:12px;
        }

        #zone-wise-content .zws-rank-row{
            display:flex;
            align-items:center;
            gap:10px;
        }

        #zone-wise-content .zws-rank-number{
            width:25px;
            color:#8b9a9d;
            font-size:11px;
            font-weight:900;
            text-align:center;
        }

        #zone-wise-content .zws-rank-main{
            flex:1;
            min-width:0;
        }

        #zone-wise-content .zws-rank-label{
            display:flex;
            justify-content:space-between;
            gap:12px;
            margin-bottom:5px;
            color:#365c61;
            font-size:11px;
            font-weight:750;
        }

        #zone-wise-content .zws-rank-label strong{
            color:#234f54;
            font-weight:900;
        }

        #zone-wise-content .zws-rank-track{
            position:relative;
            height:9px;
            overflow:visible;
            border-radius:99px;
            background:#edf2f3;
        }

        #zone-wise-content .zws-rank-bar{
            height:100%;
            border-radius:99px;
            background:#6a9da1;
            transition:background .2s ease;
        }

        #zone-wise-content .zws-rank-bar.zws-performance-good{
            background:#4f9d69;
        }

        #zone-wise-content .zws-rank-bar.zws-performance-average{
            background:#d6a83d;
        }

        #zone-wise-content .zws-rank-bar.zws-performance-low{
            background:#d45b5b;
        }

        #zone-wise-content .zws-target-marker{
            position:absolute;
            top:-3px;
            width:2px;
            height:15px;
            background:#d39416;
        }

        #zone-wise-content .zws-empty,
        #zone-wise-content .zws-empty-inline{
            padding:35px;
            text-align:center;
            color:#788b8f;
            font-size:12px;
        }

        #zone-wise-content .zws-empty-title{
            margin-bottom:5px;
            color:#365d62;
            font-size:14px;
            font-weight:900;
        }

        @media(max-width:1100px){

            #zone-wise-content .zws-hero-grid{
                grid-template-columns:repeat(2,1fr);
            }

            #zone-wise-content .zws-gauge-card{
                grid-column:span 2;
            }
        }

        @media(max-width:700px){

            #zone-wise-content .zws-header{
                align-items:flex-start;
                flex-direction:column;
            }

            #zone-wise-content .zws-header-meta{
                width:100%;
            }

            #zone-wise-content .zws-hero-grid{
                grid-template-columns:1fr;
            }

            #zone-wise-content .zws-gauge-card{
                grid-column:auto;
            }

            #zone-wise-content .zws-section-card{
                padding:12px;
            }
        }

    `);

    sahayog_inject_style("zone-wise-final-visibility-fix", `
        #zone-wise-content{
            width:100% !important;
            max-width:100% !important;
            overflow:visible !important;
            box-sizing:border-box !important;
        }

        #zone-wise-content .zws-dashboard{
            width:100% !important;
            max-width:100% !important;
            min-width:0 !important;
            overflow:visible !important;
            box-sizing:border-box !important;
        }

        #zone-wise-content .zws-section-card{
            width:100% !important;
            max-width:100% !important;
            min-width:0 !important;
            overflow:visible !important;
            box-sizing:border-box !important;
        }

        #zone-wise-content .zws-table-wrap{
            width:100% !important;
            max-width:100% !important;
            overflow-x:auto !important;
            overflow-y:visible !important;
            display:block !important;
            box-sizing:border-box !important;
        }

        #zone-wise-content .zws-table{
            width:100% !important;
            min-width:760px !important;
            border-collapse:collapse !important;
            visibility:visible !important;
        }

        #zone-wise-content .zws-grand-total-row{
            display:table-row !important;
            visibility:visible !important;
            opacity:1 !important;
        }

        #zone-wise-content .zws-grand-total-row td{
            display:table-cell !important;
            visibility:visible !important;
            opacity:1 !important;
        }

        @media (max-width:1100px){
            #zone-wise-content .zws-hero-grid{
                grid-template-columns:repeat(2,minmax(0,1fr)) !important;
            }
        }

        @media (max-width:700px){
            #zone-wise-content .zws-hero-grid{
                grid-template-columns:1fr !important;
            }

            #zone-wise-content .zws-table{
                min-width:700px !important;
            }
        }
    `);

    console.log(
        "Zone Wise modern dashboard rendered:",
        result
    );
}




/* ZONE WISE GRAND TOTAL DARK BACKGROUND FIX */
sahayog_inject_style("zone-wise-grand-total-dark-fix", `
    #zone-wise-content .zws-table .zws-grand-total-row,
    #zone-wise-content .zws-table .zws-grand-total-row td{
        background:#b9d5d9 !important;
        color:#0d363c !important;
    }

    #zone-wise-content .zws-table .zws-grand-total-row td{
        font-weight:950 !important;
    }

    #zone-wise-content .zws-table .zws-grand-total-row .zws-grand-total-label,
    #zone-wise-content .zws-table .zws-grand-total-row .zws-grand-total-cell{
        background:#b9d5d9 !important;
        color:#0d363c !important;
    }
`);

/* Region Wise: single tree column (Zone / Region / COM) */
sahayog_inject_style("region-tree-style", [
    '.region-wise-power-table th.hierarchy-column{width:auto!important;min-width:320px;text-align:left!important;}',
    '.region-wise-power-table td.tree-cell{text-align:left!important;border-left:none!important;}',
    '.region-wise-power-table td.tree-cell::before{display:none!important;content:none!important;}',
    '.region-wise-power-table td.tree-region{padding-left:34px!important;}',
    '.region-wise-power-table td.tree-com{padding-left:78px!important;}',
    '.region-wise-power-table tr.hierarchy-zone-row td,.region-wise-power-table tr.hierarchy-region-row td{font-weight:700;}'
].join(""));

/* Region Wise: remove tree lines / dashes and extra white space */
sahayog_inject_style("region-tree-clean", [
    '.region-wise-power-table{table-layout:auto!important;width:100%!important;}',
    '.region-wise-power-table th,.region-wise-power-table td{border-left:0!important;border-right:0!important;box-shadow:none!important;background-image:none!important;}',
    '.region-wise-power-table tr::before,.region-wise-power-table tr::after,',
    '.region-wise-power-table th::before,.region-wise-power-table th::after,',
    '.region-wise-power-table td::before,.region-wise-power-table td::after{content:none!important;display:none!important;border:0!important;background:none!important;}',
    '.region-wise-power-table th:first-child,.region-wise-power-table td:first-child{width:auto!important;min-width:0!important;text-align:left!important;}',
    '.region-wise-power-table th.hierarchy-column{min-width:0!important;padding-left:16px!important;}',
    '.region-wise-power-table td.tree-zone{padding-left:12px!important;}',
    '.region-wise-power-table td.tree-region{padding-left:34px!important;}',
    '.region-wise-power-table td.tree-com{padding-left:58px!important;}',
    '.region-wise-power-table .hierarchy-toggle{margin:0!important;padding-left:0!important;border:0!important;}',
    '.region-wise-power-table th.score-column,.region-wise-power-table th.change-column,',
    '.region-wise-power-table td.bhsc-score-cell,.region-wise-power-table td.bhsc-change-cell{width:130px!important;text-align:center!important;}'
].join(""));

/* Region Wise: compact professional table */
sahayog_inject_style("region-tree-compact", [
    '#com-wise-content .region-wise-kpi-grid,#com-wise-content .region-wise-table-wrapper{max-width:900px;}',
    '#com-wise-content .region-wise-table-wrapper{border:1px solid #d5e1e3;border-radius:12px;overflow:hidden;box-shadow:0 2px 8px rgba(15,23,42,.04);}',
    '#com-wise-content .region-wise-power-table{table-layout:fixed!important;width:100%!important;}',
    '#com-wise-content .region-wise-power-table th.score-column,#com-wise-content .region-wise-power-table th.change-column,',
    '#com-wise-content .region-wise-power-table td.bhsc-score-cell,#com-wise-content .region-wise-power-table td.bhsc-change-cell{width:120px!important;text-align:center!important;}',
    '#com-wise-content .region-wise-power-table th.hierarchy-column{width:auto!important;}',
    '#com-wise-content .region-wise-power-table tbody td{padding-top:9px!important;padding-bottom:9px!important;}',
    '#com-wise-content .region-wise-power-table tr.hierarchy-com-row:hover td{background:#f1f7f8!important;}',
    '#com-wise-content .region-wise-power-table tr.hierarchy-grand-total-row td{background:#3A6F75!important;color:#fff!important;font-weight:800;}',
    '#com-wise-content .region-wise-power-table tr.hierarchy-grand-total-row td span{color:#fff!important;}'
].join(""));

/* =========================================================
   REGION SNAPSHOT - CURRENT / PREVIOUS MONTH INDICATORS
   ========================================================= */
sahayog_inject_style("region-snapshot-indicator-style", [
    '.rsp2-legend{display:flex;gap:12px;align-items:center;margin:8px 0 10px;}',
    '.rsp2-legend-item{display:inline-flex;align-items:center;gap:5px;font-size:9px;font-weight:700;color:#60777b;}',
    '.rsp2-legend-dot{width:8px;height:8px;border-radius:50%;display:inline-block;}',
    '.rsp2-current-dot{background:#4f9665;}',
    '.rsp2-previous-dot{background:#d6a62a;}',
    '.rsp2-score-wrap{display:flex;flex-direction:column;align-items:flex-end;gap:3px;}',
    '.rsp2-score-badge{display:inline-flex;align-items:center;gap:4px;padding:2px 6px;border-radius:5px;font-size:8px;font-weight:800;line-height:1.2;}',
    '.rsp2-current-badge{background:#e8f4eb;color:#2f7a4c;}',
    '.rsp2-previous-badge{background:#fff5d9;color:#9a7415;}',
    '.rsp2-score-main{font-size:12px;font-weight:800;color:#234f54;}',
    '.rsp2-previous-score{font-size:10px;font-weight:700;color:#9a7415;}',
    '.rsp2-track{background:#f4f5f2!important;}',
    '.rsp2-fill{position:absolute;left:0;top:0;z-index:2;background:#4f9665!important;}',
    '.rsp2-previous-fill{position:absolute;left:0;top:0;z-index:1;height:100%;border-radius:999px;background:#e3b83f!important;opacity:.75;}',
    '.rsp2-current-score{display:block;color:#2f7a4c;font-size:12px;font-weight:800;}',
    '.rsp2-previous-score{display:block;color:#9a7415;font-size:9px;font-weight:700;margin-top:2px;}'
].join(""));

/* =========================================================
   REGION WISE SIDE PANEL (zone bars + top/bottom regions)
   ========================================================= */
function render_region_side_panel(zones, data, zone_totals, selected_month, previous_month){
    let dash = $("#com-wise-content .region-wise-dashboard");
    if(!dash.length){ return; }
    $("#region-side-panel").remove();

    let esc = (v)=>frappe.utils.escape_html(String(v));
    let num = (v)=>{
        if(v === null || v === undefined || v === ""){ return null; }
        let n = Number(v);
        return Number.isFinite(n) ? n : null;
    };
    let clamp = (n)=>Math.max(0, Math.min(100, n));

    // ---- zone performance rows ----
    let zone_rows = "";
    (zones || []).forEach(function(zone){
        let tot = (zone_totals || {})[zone] || {};
        let cur = num(tot.selected);
        let prev = num(tot.previous);

        let delta = '<span class="rsp2-delta">-</span>';
        if(cur !== null && prev !== null){
            let d = cur - prev;
            if(Math.abs(d) < 0.005){
                delta = '<span class="rsp2-delta">&rarr; 0.00</span>';
            }else if(d > 0){
                delta = '<span class="rsp2-delta rsp2-up">&uarr; ' + d.toFixed(2) + '</span>';
            }else{
                delta = '<span class="rsp2-delta rsp2-down">&darr; ' + Math.abs(d).toFixed(2) + '</span>';
            }
        }

        let previous_bar = prev === null ? "" :
            '<span class="rsp2-previous-fill" style="width:' + clamp(prev) + '%"></span>';

        let current_badge_left = cur === null ? 0 : clamp(cur);
        let previous_badge_left = prev === null ? 0 : clamp(prev);

        let badges_close =
            cur !== null &&
            prev !== null &&
            Math.abs(current_badge_left - previous_badge_left) < 15;

        let current_badge_shift = 0;
        let previous_badge_shift = 0;

        let hover_badges = `
            ${cur === null ? "" : `
            <span class="rsp2-hover-badge rsp2-hover-current"
                  style="left:calc(${current_badge_left}% + ${current_badge_shift}px);">
                <span class="rsp2-hover-dot"></span>
                ${esc(selected_month)}: ${cur.toFixed(2)}
            </span>`}
            ${prev === null ? "" : `
            <span class="rsp2-hover-badge rsp2-hover-previous"
                  style="left:calc(${previous_badge_left}% + ${previous_badge_shift}px);">
                <span class="rsp2-hover-dot"></span>
                ${esc(previous_month)}: ${prev.toFixed(2)}
            </span>`}`;

        zone_rows += `
            <div class="rsp2-zrow">
                <span class="rsp2-zname">${esc(zone)}</span>
                <span class="rsp2-track">
                    ${previous_bar}
                    <span class="rsp2-fill" style="width:${cur === null ? 0 : clamp(cur)}%"></span>
                    ${hover_badges}
                </span>
                <span class="rsp2-score">
                    <span class="rsp2-current-score">${cur === null ? "-" : cur.toFixed(2)}</span>
                    <span class="rsp2-previous-score">${prev === null ? "-" : prev.toFixed(2)}</span>
                </span>
                ${delta}
            </div>`;
    });

    // ---- region ranking ----
    let region_list = [];
    (zones || []).forEach(function(zone){
        let zd = (data || {})[zone] || {};
        Object.keys(zd).forEach(function(region){
            if(region === "_total"){ return; }
            let tot = (zd[region] || {})["_total"] || {};
            let cur = num(tot.selected);
            if(cur !== null){
                region_list.push({name: zone + " · " + region, value: cur});
            }
        });
    });
    region_list.sort((a,b)=>b.value - a.value);

    let rank_html = function(list){
        if(!list.length){ return '<div class="rsp2-empty">No data</div>'; }
        return list.map(function(r, i){
            return `<div class="rsp2-rrow">
                <span class="rsp2-rank">${i + 1}</span>
                <span class="rsp2-rname">${esc(r.name)}</span>
                <span class="rsp2-rscore">${r.value.toFixed(2)}</span>
            </div>`;
        }).join("");
    };
    let zone_top_list = [];
    (zones || []).forEach(function(z){
        let best = null;
        region_list.forEach(function(r){
            if(String(r.name).split(" · ")[0] === z && (!best || r.value > best.value)){
                best = r;
            }
        });
        if(best){ zone_top_list.push(best); }
    });
    let top3 = region_list.slice(0, 3);
    let bottom3 = region_list.length > 3 ? region_list.slice(-3).reverse() : [];

    let html = `
        <div id="region-side-panel">
            <div class="rsp2-card">
                <div class="rsp2-head">
                    <div class="rsp2-title">Performance Snapshot</div>
                    <div>
                        <div class="rsp2-sub">${esc(selected_month)} vs ${esc(previous_month)}</div>
                        <div class="rsp2-legend">
                            <span><i class="rsp2-legend-current"></i>Current Month</span>
                            <span><i class="rsp2-legend-previous"></i>Previous Month</span>
                        </div>
                    </div>
                </div>

                <div class="rsp2-section">Zone Performance</div>
                <div class="rsp2-cols">
                    <span>Zone</span><span>${esc(selected_month)} (bar) / ${esc(previous_month)} (tick)</span><span>Score</span><span>Var.</span>
                </div>
                <div class="rsp2-zone-grid">
                    ${zone_rows || '<div class="rsp2-empty">No data</div>'}
                </div>

                <div class="rsp2-split">
                    <div>
                        <div class="rsp2-section">Current Month Top Region per Zone</div>
                        <div class="rsp2-ranklist">${rank_html(zone_top_list)}</div>
                    </div>
                </div>
            </div>
        </div>`;

    dash.append(html);
}

sahayog_inject_style("region-side-style", [
    '#com-wise-content .region-wise-dashboard{display:grid;grid-template-columns:minmax(0,1.3fr) minmax(0,1fr);column-gap:16px;align-items:start;}',
    '#com-wise-content .region-wise-heading{grid-column:1 / -1;grid-row:1;}',
    '#com-wise-content .region-wise-kpi-grid{grid-column:1;grid-row:2;max-width:none!important;}',
    '#com-wise-content .region-wise-table-wrapper{grid-column:1;grid-row:3;max-width:none!important;}',
    '#com-wise-content #region-side-panel{grid-column:2;grid-row:2 / span 2;display:flex;flex-direction:column;gap:14px;}',
    '#com-wise-content #region-wise-trend-graph{grid-column:1 / -1;grid-row:4;min-width:0;}',
    '@media(max-width:1100px){#com-wise-content .region-wise-dashboard{display:block;}#com-wise-content #region-side-panel{margin-top:14px;}}'
].join(""));


sahayog_inject_style("region-snapshot-legend-style", [
    '#com-wise-content #region-side-panel .rsp2-legend{display:flex!important;justify-content:flex-end!important;align-items:center!important;gap:12px!important;margin-top:5px!important;font-size:9px!important;font-weight:700!important;color:#60777b!important;}',
    '#com-wise-content #region-side-panel .rsp2-legend span{display:inline-flex!important;align-items:center!important;gap:4px!important;white-space:nowrap!important;}',
    '#com-wise-content #region-side-panel .rsp2-legend i{display:inline-block!important;width:8px!important;height:8px!important;border-radius:50%!important;}',
    '#com-wise-content #region-side-panel .rsp2-legend-current{background:#4f9665!important;}',
    '#com-wise-content #region-side-panel .rsp2-legend-previous{background:#e3b83f!important;}'
].join(""));

sahayog_inject_style("region-snapshot-style", [
    '.rsp2-card{background:#fff;border:1px solid #d5e1e3;border-radius:12px;padding:16px 18px;box-shadow:0 2px 8px rgba(15,23,42,.04);}',
    '.rsp2-head{display:flex;justify-content:space-between;align-items:baseline;padding-bottom:10px;border-bottom:1px solid #e1e9ea;}',
    '.rsp2-title{color:#234f54;font-size:14px;font-weight:800;}',
    '.rsp2-sub{color:#60777b;font-size:11px;font-weight:600;}',
    '.rsp2-section{margin:14px 0 6px;color:#60777b;font-size:10px;font-weight:800;letter-spacing:.8px;text-transform:uppercase;}',
    '.rsp2-cols,.rsp2-zrow{display:grid;grid-template-columns:64px minmax(0,1fr) 54px 62px;align-items:center;column-gap:12px;}',
    '.rsp2-cols{padding:0 0 4px;color:#8a9ca0;font-size:9px;font-weight:700;letter-spacing:.3px;border-bottom:1px solid #eef3f4;}',
    '.rsp2-cols span:nth-child(3),.rsp2-cols span:nth-child(4){text-align:right;}',
    '.rsp2-zrow{height:56px;border-bottom:1px solid #f1f5f6;}',
    '.rsp2-zname{font-size:11px;font-weight:700;color:#405c60;}',
    '.rsp2-track{position:relative;height:10px;background:#f4f5f2!important;border:1px solid #cbd8da;border-radius:999px;box-sizing:border-box;overflow:visible;}',
    '.rsp2-fill{position:absolute;left:0;top:0;z-index:2;height:100%;background:#4f9665!important;border-radius:999px;}',
    '.rsp2-previous-fill{position:absolute;left:0;top:0;z-index:1;height:100%;border-radius:999px;background:#e3b83f!important;opacity:.85;}',
    '.rsp2-tick{display:none;}',
    '.rsp2-hover-badge{position:absolute;z-index:20;display:inline-flex;align-items:center;gap:4px;padding:4px 7px;border-radius:6px;font-size:9px;font-weight:800;line-height:1;white-space:nowrap;box-shadow:0 3px 10px rgba(15,23,42,.14);border:1px solid;transform:translateX(-50%);pointer-events:none;}',
    '.rsp2-hover-current{top:calc(100% + 13px);}',
    '.rsp2-hover-previous{bottom:calc(100% + 13px);}',
    '.rsp2-hover-current::before{content:"";position:absolute;left:50%;bottom:100%;height:10px;border-left:2px solid #4f9665;}',
    '.rsp2-hover-current::after{content:"";position:absolute;left:50%;bottom:calc(100% + 8px);width:0;height:0;border-left:4px solid transparent;border-right:4px solid transparent;border-top:6px solid #4f9665;transform:translateX(-50%);}',
    '.rsp2-hover-previous::after{content:"";position:absolute;left:50%;top:100%;height:10px;border-left:2px solid #e3b83f;}',
    '.rsp2-hover-previous::before{content:"";position:absolute;left:50%;top:calc(100% + 8px);width:0;height:0;border-left:4px solid transparent;border-right:4px solid transparent;border-bottom:6px solid #e3b83f;transform:translateX(-50%);}',
    '.rsp2-hover-current{background:#eaf5ed;color:#2f7a4c;border-color:#c9e2d0;}',
    '.rsp2-hover-previous{background:#fff6dc;color:#9a7415;border-color:#ead58e;}',
    '.rsp2-hover-dot{width:6px;height:6px;border-radius:50%;display:inline-block;flex:none;}',
    '.rsp2-hover-current .rsp2-hover-dot{background:#4f9665;}',
    '.rsp2-hover-previous .rsp2-hover-dot{background:#e3b83f;}',

    '.rsp2-score{text-align:right;font-size:12px;font-weight:800;color:#234f54;}',
    '.rsp2-delta{text-align:right;font-size:10px;font-weight:700;color:#60777b;}',
    '.rsp2-up{color:#2f7a4c;}',
    '.rsp2-down{color:#b23c43;}',
    '.rsp2-split{display:grid;grid-template-columns:1fr 1fr;column-gap:22px;margin-top:6px;}',
    '.rsp2-rrow{display:grid;grid-template-columns:18px minmax(0,1fr) auto;align-items:center;column-gap:8px;height:30px;border-bottom:1px solid #f1f5f6;}',
    '.rsp2-rank{color:#8a9ca0;font-size:11px;font-weight:800;}',
    '.rsp2-rname{font-size:11px;font-weight:600;color:#405c60;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;}',
    '.rsp2-rscore{font-size:12px;font-weight:800;color:#234f54;}',
    '.rsp2-empty{color:#60777b;font-size:11px;padding:6px 0;}',
    '@media(max-width:520px){.rsp2-split{grid-template-columns:1fr;}}'
].join(""));

/* Region Wise: Snapshot card level with the main table (same top and bottom) */
sahayog_inject_style("region-equal-style", [
    '#com-wise-content #region-side-panel{grid-column:2!important;grid-row:2 / span 2!important;align-self:stretch!important;margin-top:0!important;padding-top:0!important;display:flex!important;flex-direction:column;}',
    '#com-wise-content #region-side-panel .rsp2-card{flex:1 1 auto;display:flex;flex-direction:column;min-height:520px!important;box-sizing:border-box!important;}',
    '#com-wise-content #region-side-panel .rsp2-split{margin-top:auto;}'
].join(""));

sahayog_inject_style("region-short-style", [
    '#region-wise-trend-graph .region-trend-chart-wrap{height:auto!important;padding-bottom:6px;}',
    '#region-wise-trend-graph .region-trend-chart{height:auto!important;}'
].join(""));

sahayog_inject_style("region-noimprove-style", [
    '#com-wise-content #region-side-panel .rsp2-split{grid-template-columns:1fr!important;}'
].join(""));

sahayog_inject_style("region-ranklist-style", [
    '#com-wise-content #region-side-panel .rsp2-ranklist{max-height:240px;overflow-y:auto;padding-right:6px;}',
    '#com-wise-content #region-side-panel .rsp2-ranklist::-webkit-scrollbar{width:5px;}',
    '#com-wise-content #region-side-panel .rsp2-ranklist::-webkit-scrollbar-thumb{background:#c5d5d7;border-radius:4px;}'
].join(""));


sahayog_inject_style("region-zonetop-style", [
    '#com-wise-content #region-side-panel .rsp2-split{display:flex!important;flex-direction:column!important;margin-top:18px!important;margin-bottom:0!important;align-self:stretch!important;flex:1 1 auto!important;min-height:0!important;}',
    '#com-wise-content #region-side-panel .rsp2-split > div{width:100%!important;align-self:stretch!important;display:flex!important;flex-direction:column!important;flex:1 1 auto!important;min-height:0!important;}',
    '#com-wise-content #region-side-panel .rsp2-ranklist{max-height:none!important;overflow:visible!important;display:grid!important;grid-template-columns:minmax(0,1fr) minmax(0,1fr)!important;grid-template-rows:repeat(3,1fr)!important;grid-auto-flow:column!important;column-gap:22px!important;row-gap:0!important;align-items:stretch!important;align-content:stretch!important;justify-content:stretch!important;flex:1 1 auto!important;min-height:0!important;}',
    '#com-wise-content #region-side-panel .rsp2-ranklist > *{min-width:0!important;align-self:stretch!important;height:100%!important;}',
    '#com-wise-content #region-side-panel .rsp2-card .rsp2-split{margin-top:0!important;align-self:stretch!important;position:relative!important;top:0!important;}'
].join(""));

/* Snapshot keeps its own height; does not stretch with the table */
sahayog_inject_style("region-badge-space-style", [
    '#com-wise-content #region-side-panel{margin-top:0!important;}',
    '#com-wise-content #region-side-panel .rsp2-card{padding-top:22px!important;}',
    '#com-wise-content #region-side-panel .rsp2-zrow{height:100px!important;}'
].join(""));

sahayog_inject_style("region-zone-grid-style", [
    '#com-wise-content #region-side-panel .rsp2-section{margin-bottom:8px!important;}',
    '#com-wise-content #region-side-panel .rsp2-zone-grid{display:grid!important;grid-template-columns:minmax(0,1fr) minmax(0,1fr)!important;grid-template-rows:repeat(3,100px)!important;column-gap:18px!important;row-gap:0!important;align-items:stretch!important;min-height:300px!important;}',
    '#com-wise-content #region-side-panel .rsp2-zone-grid .rsp2-zrow{display:grid!important;grid-template-columns:42px minmax(0,1fr) 42px!important;column-gap:8px!important;height:100px!important;min-height:100px!important;min-width:0!important;align-items:center!important;}',
    '#com-wise-content #region-side-panel .rsp2-zone-grid .rsp2-zrow:nth-child(1){grid-column:1!important;grid-row:1!important;}',
    '#com-wise-content #region-side-panel .rsp2-zone-grid .rsp2-zrow:nth-child(2){grid-column:1!important;grid-row:2!important;}',
    '#com-wise-content #region-side-panel .rsp2-zone-grid .rsp2-zrow:nth-child(3){grid-column:1!important;grid-row:3!important;}',
    '#com-wise-content #region-side-panel .rsp2-zone-grid .rsp2-zrow:nth-child(4){grid-column:2!important;grid-row:1!important;}',
    '#com-wise-content #region-side-panel .rsp2-zone-grid .rsp2-zrow:nth-child(5){grid-column:2!important;grid-row:2!important;}',
    '#com-wise-content #region-side-panel .rsp2-zone-grid .rsp2-zrow:nth-child(6){grid-column:2!important;grid-row:3!important;}',
    '#com-wise-content #region-side-panel .rsp2-zone-grid .rsp2-score{display:none!important;}',
    '#com-wise-content #region-side-panel .rsp2-cols{display:none!important;}'
].join(""));

sahayog_inject_style("region-snapshot-height-style", [
    '#com-wise-content #region-side-panel .rsp2-card{height:100%!important;min-height:520px!important;box-sizing:border-box!important;}',
    '#com-wise-content #region-side-panel .rsp2-zone-grid{flex:1 1 auto!important;}',
    '#com-wise-content #region-side-panel .rsp2-split{margin-top:18px!important;}'
].join(""));

sahayog_inject_style("region-fixedsize-style", [
    '#com-wise-content #region-side-panel{align-self:stretch!important;height:auto!important;display:flex!important;position:sticky;top:90px;}',
    '#com-wise-content #region-side-panel .rsp2-card{flex:1 1 auto!important;display:flex!important;flex-direction:column!important;height:auto!important;min-height:520px!important;box-sizing:border-box!important;}',
    '#com-wise-content #region-side-panel .rsp2-split{margin-top:18px!important;}'
].join(""));

/* =========================================================
   ZONE WISE TABLE: heatmap, no-data dash, variance, latest column
   ========================================================= */
function sahayog_style_zone_table(container){
    let table = container.find(".zone-wise-table");
    if(!table.length){ return; }

    let head_cells = table.find("thead th");
    let last_col = head_cells.length - 1;
    if(last_col < 1){ return; }

    let parse = function(cell){
        let span = $(cell).find(".zone-score-value");
        if(!span.length){ return null; }
        let txt = span.text().trim();
        if(txt === "" || txt === "\u2014"){ return null; }
        let n = Number(txt);
        if(!Number.isFinite(n) || n === 0){ return null; }
        return n;
    };

    table.find("tbody tr").each(function(){
        let cells = $(this).children("td");
        let is_total = $(this).hasClass("grand-total-row");

        cells.each(function(idx){
            if(idx === 0){ return; }
            let n = parse(this);
            let span = $(this).find(".zone-score-value");

            if(n === null){
                span.text("\u2013").css({color:"#b6c3c6", fontWeight:"600"});
                return;
            }

            if(!is_total){
                let ratio = Math.max(0, Math.min(1, (n - 80) / 20));
                let alpha = 0.06 + ratio * 0.34;
                $(this).css("background", "rgba(58,111,117," + alpha.toFixed(3) + ")");
                span.css("color", ratio > 0.75 ? "#173f44" : "#234f54");
            }
        });

        let cur = parse(cells.get(last_col));
        let prev = last_col > 1 ? parse(cells.get(last_col - 1)) : null;
        if(cur !== null && prev !== null){
            let d = cur - prev;
            let html;
            if(Math.abs(d) < 0.005){
                html = '<span style="color:#60777b;">&rarr; 0.00</span>';
            }else if(d > 0){
                html = '<span style="color:#2f7a4c;">&uarr; ' + d.toFixed(2) + '</span>';
            }else{
                html = '<span style="color:#b23c43;">&darr; ' + Math.abs(d).toFixed(2) + '</span>';
            }
            $(cells.get(last_col)).append(
                '<div style="font-size:10px;font-weight:700;margin-top:2px;">' + html + '</div>'
            );
        }
    });

    table.find("thead th").eq(last_col).css({
        background:"#2f6a71", color:"#fff"
    });
    table.find("tbody tr").each(function(){
        if($(this).hasClass("grand-total-row")){ return; }
        $(this).children("td").eq(last_col).css("box-shadow", "inset 0 0 0 1.5px rgba(58,111,117,.55)");
    });
}

sahayog_inject_style("zone-heatmap-style", [
    '.zone-wise-table td{transition:background .15s ease;}',
    '.zone-wise-table tbody tr:not(.grand-total-row):hover td{filter:brightness(.97);}'
].join(""));

/* Snapshot variance: block badge, bigger arrow/text */
(function(){
$("#region-delta-badge-style").remove();
$("head").append('<style id="region-delta-badge-style">' +
'#com-wise-content #region-side-panel .rsp2-delta{display:inline-flex!important;align-items:center;justify-content:center;justify-self:end;min-width:58px;padding:4px 8px;border-radius:6px;font-size:13px!important;font-weight:800!important;line-height:1.2;white-space:nowrap;letter-spacing:.2px;}' +
'#com-wise-content #region-side-panel .rsp2-delta.rsp2-up{background:#dff3e6;color:#1b6b3a!important;border:1px solid #9fd3b3;}' +
'#com-wise-content #region-side-panel .rsp2-delta.rsp2-down{background:#fde3e3;color:#a4262c!important;border:1px solid #f0a9ac;}' +
'#com-wise-content #region-side-panel .rsp2-delta:not(.rsp2-up):not(.rsp2-down){background:transparent;color:#8a9ca0!important;font-weight:700!important;}' +
'</style>');
})();

/* Snapshot: reserve space for the variance badge so it never overlaps the bar */
(function(){
$("#region-delta-fit-style").remove();
$("head").append('<style id="region-delta-fit-style">' +
'#com-wise-content #region-side-panel .rsp2-cols,#com-wise-content #region-side-panel .rsp2-zrow{grid-template-columns:64px minmax(0,1fr) auto auto!important;column-gap:12px!important;}' +
'#com-wise-content #region-side-panel .rsp2-delta{box-sizing:border-box;min-width:0!important;width:auto!important;padding:3px 8px!important;margin-left:6px;position:static!important;justify-self:end;}' +
'#com-wise-content #region-side-panel .rsp2-zrow{overflow:visible;}' +
'</style>');
})();

/* Snapshot: wider panel, smaller variance badge, space reserved for it */
(function(){
$("#region-delta-small-style").remove();
$("head").append('<style id="region-delta-small-style">' +
'#com-wise-content .region-wise-dashboard{grid-template-columns:minmax(0,1.3fr) minmax(0,1fr)!important;}' +
'#com-wise-content #region-side-panel .rsp2-delta{font-size:11px!important;font-weight:800!important;padding:2px 6px!important;min-width:0!important;width:auto!important;border-radius:5px!important;line-height:1.2!important;white-space:nowrap;}' +
'#com-wise-content #region-side-panel .rsp2-track{margin-right:52px!important;}' +
'#com-wise-content #region-side-panel .rsp2-zrow{overflow:visible;}' +
'</style>');
})();

/* Snapshot: do not stretch with the table (height only, nothing else) */
sahayog_inject_style("region-snapshot-nostretch-style", [
    '#com-wise-content .region-wise-dashboard #region-side-panel{align-self:start!important;height:auto!important;}',
    '#com-wise-content .region-wise-dashboard #region-side-panel .rsp2-card{height:auto!important;}'
].join(""));

/* Snapshot: match table bottom once (collapsed state), then stay fixed */
function sahayog_lock_snapshot_height(){
    let card = document.querySelector("#region-side-panel .rsp2-card");
    let wrap = document.querySelector("#com-wise-content .region-wise-table-wrapper");
    if(!card || !wrap){ return; }
    if(document.querySelector("#com-wise-content .zone-toggle[data-expanded='true']")){ return; }
    let target = Math.round(
        wrap.getBoundingClientRect().bottom - card.getBoundingClientRect().top
    );
    if(target < 200){ return; }
    ["height", "min-height", "max-height"].forEach(function(prop){
        card.style.setProperty(prop, target + "px", "important");
    });
}

/* Snapshot variance: make the up/down arrow clearly visible */
function sahayog_enlarge_delta_arrows(){
    $("#region-side-panel .rsp2-delta.rsp2-up, #region-side-panel .rsp2-delta.rsp2-down").each(function(){
        if($(this).find(".rsp2-arrow").length){ return; }
        let txt = $(this).text().trim();
        let arrow = txt.charAt(0);
        let rest = txt.slice(1).trim();
        if(arrow !== "\u2191" && arrow !== "\u2193"){ return; }
        $(this).html('<span class="rsp2-arrow">' + arrow + '</span><span>' + rest + '</span>');
    });
}

sahayog_inject_style("region-delta-arrow-style", [
    '#com-wise-content #region-side-panel .rsp2-delta{display:inline-flex!important;align-items:center!important;gap:3px!important;}',
    '#com-wise-content #region-side-panel .rsp2-delta .rsp2-arrow{font-size:17px!important;font-weight:900!important;line-height:1!important;}'
].join(""));


/* ZONE WISE TABLE VISIBILITY OVERRIDE */
sahayog_inject_style("zone-wise-table-visibility-override", `
    #zone-wise-content .zws-table{
        border-collapse:separate !important;
        border-spacing:3px !important;
        background:#ffffff !important;
    }

    #zone-wise-content .zws-table th{
        padding:8px 7px !important;
        color:#0d363c !important;
        font-size:12px !important;
        font-weight:950 !important;
        text-align:center !important;
        background:#c5dadd !important;
    }

    #zone-wise-content .zws-table th small{
        display:block !important;
        margin-top:3px !important;
        color:#234f55 !important;
        font-size:10px !important;
        font-weight:850 !important;
        line-height:1.1 !important;
    }

    #zone-wise-content .zws-table th:first-child{
        text-align:left !important;
        color:#0d363c !important;
    }

    #zone-wise-content .zws-table td{
        height:48px !important;
        padding:5px 8px !important;
        border:0 !important;
        border-radius:7px !important;
        color:#173f44 !important;
        font-size:13px !important;
        font-weight:900 !important;
        text-align:center !important;
        vertical-align:middle !important;
    }

    #zone-wise-content .zws-table td:first-child{
        background:#ffffff !important;
        color:#173f44 !important;
        font-size:13px !important;
        font-weight:950 !important;
        text-align:left !important;
    }

    #zone-wise-content .zws-zone-name{
        color:#173f44 !important;
        font-size:13px !important;
        font-weight:950 !important;
    }

    #zone-wise-content .zws-score-cell{
        min-width:82px !important;
    }

    #zone-wise-content .zws-score{
        display:block !important;
        color:#173f44 !important;
        font-size:15px !important;
        font-weight:950 !important;
        line-height:1.15 !important;
    }

    #zone-wise-content .zws-score-cell small{
        display:block !important;
        margin-top:3px !important;
        font-size:11px !important;
        font-weight:950 !important;
        line-height:1.05 !important;
    }

    #zone-wise-content .zws-cell-good{
        background:#f5fbf6 !important;
        color:#236b3a !important;
    }

    #zone-wise-content .zws-cell-good .zws-score{
        color:#236b3a !important;
    }

    #zone-wise-content .zws-cell-warning{
        background:#fffdf2 !important;
        color:#7a5700 !important;
    }

    #zone-wise-content .zws-cell-warning .zws-score{
        color:#7a5700 !important;
    }

    #zone-wise-content .zws-cell-danger{
        background:#fff7f7 !important;
        color:#9b3434 !important;
    }

    #zone-wise-content .zws-cell-danger .zws-score{
        color:#9b3434 !important;
    }

    #zone-wise-content .zws-cell-none{
        background:repeating-linear-gradient(
            135deg,
            #ffffff 0 5px,
            #e8eeee 5px 6px
        ) !important;
        color:#647b7f !important;
    }

    #zone-wise-content .zws-no-data{
        color:#647b7f !important;
        font-size:14px !important;
        font-weight:850 !important;
    }

    #zone-wise-content .zws-cell-up{
        color:#15733a !important;
        font-size:11px !important;
        font-weight:950 !important;
    }

    #zone-wise-content .zws-cell-down{
        color:#b02a2a !important;
        font-size:11px !important;
        font-weight:950 !important;
    }

    #zone-wise-content .zws-cell-flat{
        color:#5d7074 !important;
        font-size:11px !important;
        font-weight:950 !important;
    }

    #zone-wise-content .zws-period-selected{
        box-shadow:0 0 0 2px #245c63 !important;
    }

    #zone-wise-content .zws-grand-total-row td{
        height:52px !important;
        padding:6px 8px !important;
        background:#b9d5d9 !important;
        color:#0d363c !important;
        font-size:14px !important;
        font-weight:950 !important;
        border-top:2px solid #245c63 !important;
    }

    #zone-wise-content .zws-grand-total-label{
        color:#0d363c !important;
        font-size:14px !important;
        font-weight:950 !important;
    }

    #zone-wise-content .zws-grand-total-cell{
        color:#0d363c !important;
        font-size:15px !important;
        font-weight:950 !important;
        text-align:center !important;
    }
`);

/* =========================================================
   ACCESS RE-CHECK (no hard refresh needed)
   ========================================================= */
window.sahayog_recheck_scorecard_access = function(show_feedback){
    frappe.call({
        method:"sahayog.branch_score_card.page.branch_scorecard.branch_scorecard.get_branch_scorecard_access",
        callback:function(r){
            let a = r.message || {};
            if(a.is_editor || a.has_access){
                window.location.reload();
            }else if(show_feedback){
                frappe.show_alert({
                    message:"Access not assigned yet.",
                    indicator:"orange"
                });
            }
        }
    });
};

if(frappe.pages["branch-scorecard"]){
    frappe.pages["branch-scorecard"].on_page_show = function(){
        if($("#scorecard-no-access").length){
            window.sahayog_recheck_scorecard_access(false);
        }
    };
}

$(window).off("focus.scorecardAccess").on("focus.scorecardAccess", function(){
    if($("#scorecard-no-access").length){
        window.sahayog_recheck_scorecard_access(false);
    }
});
