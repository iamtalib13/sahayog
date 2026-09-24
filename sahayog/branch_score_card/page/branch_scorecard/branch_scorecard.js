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
font-size:12px;
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
border-color:#3A6F75;
color:#fff;
box-shadow:
0 2px 5px rgba(58,111,117,.14),
inset 0 1px 1px rgba(255,255,255,.20)
}
.scorecard-refresh-btn{
width:38px;
height:38px;
min-width:38px;
flex-shrink:0;
display:flex;
align-items:center;
justify-content:center;
margin-left:0;
border:1px solid var(--teal-border);
border-radius:8px;
background:#fff;
color:var(--teal-dark);
font-size:16px;
font-weight:900;
cursor:pointer;
transition:all .15s ease;
padding:0
}
.scorecard-refresh-btn:hover{
background:var(--teal-soft);
border-color:var(--teal-dark);
color:var(--teal-dark)
}
.scorecard-refresh-btn:active{
transform:scale(.94)
}
.scorecard-refresh-btn:disabled{
opacity:.65;
cursor:wait
}
.scorecard-refresh-btn .fa{
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
font-size:10px;
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
gap:9px;
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
.scorecard-view-tab.active::after{
content:"";
position:absolute;
left:18px;
right:18px;
bottom:-6px;
height:3px;
border-radius:4px;
background:#3A6F75;
opacity:.9
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
font-size:14px;
font-weight:950;
text-align:center;
white-space:nowrap
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
font-size:14px;
font-weight:800;
text-align:center;
white-space:nowrap
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
/* Alternate rows */
.zone-wise-table tbody tr:nth-child(even):not(.grand-total-row) td{
background:#f7fafb
}
.zone-wise-table tbody tr:nth-child(even):not(.grand-total-row) td:first-child{
background:#f7fafb
}
/* Hover */
.zone-wise-table tbody tr:not(.grand-total-row):hover td{
background:#edf5f6
}
.zone-wise-table tbody tr:not(.grand-total-row):hover td:first-child{
background:#e7f2f3
}
/* Zone name */
.zone-name-cell{
font-weight:950!important;
color:#24545a!important;
letter-spacing:.1px;
font-size:14px!important
}
/* Score values */
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
background:#e3eff0!important;
border-top:2px solid #3A6F75!important;
border-bottom:1px solid #9fb4b7!important;
color:#24545a!important;
font-weight:950!important
}
.zone-wise-table .grand-total-row td:first-child{
background:#e3eff0!important;
color:#24545a!important;
font-weight:950!important
}
.grand-total-name-cell{
background:#e3eff0!important;
color:#24545a!important;
font-size:14px!important;
font-weight:950!important
}
.grand-total-row .zone-score-value{
color:#24545a!important;
font-size:14px!important;
font-weight:950!important
}
.zone-wise-loading{
display:flex;
align-items:center;
justify-content:center;
min-height:300px;
padding:40px;
border:1px solid var(--border);
border-radius:10px;
background:#fff;
color:var(--text-muted);
font-size:13px;
font-weight:700
}
.zone-wise-empty{
padding:45px 20px;
border:1px solid var(--border);
border-radius:10px;
background:#fff;
text-align:center;
color:var(--text-muted)
}
.zone-wise-empty-title{
margin-bottom:6px;
color:var(--teal-dark);
font-size:17px;
font-weight:900
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
    background:#3A6F75;
    color:#fff;
    border-color:#3A6F75;
}

.com-wise-panel{
display:block;
min-height:500px
}

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
    background:#3A6F75;
    color:#fff;
    border-color:#3A6F75;
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
.scorecard-view-tab.active::after{
left:14px;
right:14px
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


function render_zone_month_capsules(
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
                    class="zone-month-pill ${
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

    $("#zone-wise-months").html(
        months_html
    );

    return active_month;

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
                    class="com-month-pill ${
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

    $("#com-wise-months").html(
        months_html
    );

    return active_month;

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
COM Wise
</span>
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
<button
type="button"
id="scorecard-refresh-btn"
class="scorecard-refresh-btn"
title="Hard Refresh"
aria-label="Hard Refresh">
<i class="fa fa-refresh"></i>
</button>
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
            Loading COM Wise Score Card...
        </div>
    </div>

</div>
</div>
`);
initialize_zone_wise_filters();
initialize_com_wise_filters();
load_sahayog_branches();
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
window.location.replace(
window.location.pathname+
"?_="+Date.now()
);
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
method:"frappe.client.get_list",
args:{
doctype:"Sahayog Branch",
fields:[
"name",
"sol_id",
"branch",
"branch_type",
"zone",
"region",
"district",
"regional_operations_manager",
"cluster_operations_manager",
"regional__zonal_head",
"ch_dh_adh"
],
order_by:"branch asc",
limit_page_length:5000
},
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
if(is_crl_function){
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
}else if(is_other_navigation_function){
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
Loading real Zone Wise score data...
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
            Loading COM Wise Score Card...
        </div>
    `);

    frappe.call({

        method:
            "sahayog.branch_score_card.page.branch_scorecard.branch_scorecard.get_com_wise_bhsc",

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
                        No COM Wise data available.
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
                    Unable to load COM Wise data.
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
                    : "No COM Wise data available."
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
        result.grand_total || {
            excellent: 0,
            good: 0,
            needs_improvement: 0,
            grand_total: 0,
            has_data: false
        };

    let selected_month =
        result.selected_month || "";

    let selected_year =
        result.selected_year || "";

    let html = "";

    // =====================================================
    // TITLE
    // =====================================================

    html += `
        <div class="com-wise-title">
            COM Wise BHSC Performance – ${frappe.utils.escape_html(selected_month)} ${frappe.utils.escape_html(String(selected_year))}
        </div>

        <div class="com-wise-subtitle">
            Branches are categorized using their BHSC percentage:
            Excellent ≥ 85, Good ≥ 65 and Needs Improvement &lt; 65.
        </div>
    `;

    // =====================================================
    // NO DATA
    // =====================================================

    if(
        !zones.length ||
        !Object.keys(data).length
    ){

        html += `
            <div class="com-wise-empty">
                No COM Wise data available for
                ${frappe.utils.escape_html(selected_month)}
                ${frappe.utils.escape_html(String(selected_year))}.
            </div>
        `;

        $("#com-wise-content").html(
            html
        );

        return;
    }

    // =====================================================
    // TABLE
    // =====================================================

    html += `
        <div class="com-wise-table-wrapper">

            <table class="com-wise-table">

                <thead>
                    <tr>
                        <th>Zone</th>
                        <th>COM</th>
                        <th>Excellent</th>
                        <th>Good</th>
                        <th>Needs Improvement</th>
                        <th>Grand Total</th>
                    </tr>
                </thead>

                <tbody>
    `;

    // =====================================================
    // ZONE LOOP
    // =====================================================

    zones.forEach(function(zone){

        let zone_data =
            data[zone] || {};

        let coms =
            Object.keys(zone_data);

        // -------------------------------------------------
        // If zone has no COM data
        // -------------------------------------------------

        if(!coms.length){

            html += `
                <tr>

                    <td class="com-zone">
                        ${frappe.utils.escape_html(zone)}
                    </td>

                    <td class="com-name">
                        No COM Data
                    </td>

                    <td>-</td>
                    <td>-</td>
                    <td>-</td>
                    <td>-</td>

                </tr>
            `;

        }else{

            // -------------------------------------------------
            // COM ROWS
            // -------------------------------------------------

            coms.forEach(function(com, index){

                let item =
                    zone_data[com] || {};

                let has_data =
                    item.has_data === true;

                html += `
                    <tr>
                `;

                // -------------------------------------------------
                // Show Zone only once
                // -------------------------------------------------

                if(index === 0){

                    html += `
                        <td
                            class="com-zone"
                            rowspan="${coms.length}"
                        >
                            ${frappe.utils.escape_html(zone)}
                        </td>
                    `;
                }

                html += `
                        <td class="com-name">
                            ${frappe.utils.escape_html(com)}
                        </td>

                        <td>
                            ${
                                has_data
                                ? item.excellent
                                : "-"
                            }
                        </td>

                        <td>
                            ${
                                has_data
                                ? item.good
                                : "-"
                            }
                        </td>

                        <td>
                            ${
                                has_data
                                ? item.needs_improvement
                                : "-"
                            }
                        </td>

                        <td>
                            ${
                                has_data
                                ? item.grand_total
                                : "-"
                            }
                        </td>

                    </tr>
                `;
            });
        }

        // =================================================
        // ZONE TOTAL
        // =================================================

        let zone_total =
            zone_totals[zone] || {
                excellent: 0,
                good: 0,
                needs_improvement: 0,
                grand_total: 0,
                has_data: false
            };

        let zone_has_data =
            zone_total.has_data === true;

        html += `
            <tr class="zone-total-row">

                <td colspan="2">
                    ${frappe.utils.escape_html(zone)} Total
                </td>

                <td>
                    ${
                        zone_has_data
                        ? zone_total.excellent
                        : "-"
                    }
                </td>

                <td>
                    ${
                        zone_has_data
                        ? zone_total.good
                        : "-"
                    }
                </td>

                <td>
                    ${
                        zone_has_data
                        ? zone_total.needs_improvement
                        : "-"
                    }
                </td>

                <td>
                    ${
                        zone_has_data
                        ? zone_total.grand_total
                        : "-"
                    }
                </td>

            </tr>
        `;

    });

    // =====================================================
    // GRAND TOTAL
    // =====================================================

    let grand_has_data =
        grand_total.has_data === true;

    html += `
        <tr class="grand-total-row">

            <td colspan="2">
                Grand Total
            </td>

            <td>
                ${
                    grand_has_data
                    ? grand_total.excellent
                    : "-"
                }
            </td>

            <td>
                ${
                    grand_has_data
                    ? grand_total.good
                    : "-"
                }
            </td>

            <td>
                ${
                    grand_has_data
                    ? grand_total.needs_improvement
                    : "-"
                }
            </td>

            <td>
                ${
                    grand_has_data
                    ? grand_total.grand_total
                    : "-"
                }
            </td>

        </tr>
    `;

    html += `
                </tbody>

            </table>

        </div>
    `;

    $("#com-wise-content").html(
        html
    );
}
/* =========================================================
   ZONE WISE TREND GRAPH
   ========================================================= */
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
let value=null;
if(
cell_value!==null&&
cell_value!==undefined&&
typeof cell_value==="object"&&
Number.isFinite(
Number(cell_value.average)
)
){
value=
Number(
cell_value.average
);
}else if(
Number.isFinite(
Number(cell_value)
)
){
value=
Number(cell_value);
}
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
let value=null;
if(
cell_value!==null&&
cell_value!==undefined&&
typeof cell_value==="object"&&
Number.isFinite(
Number(cell_value.average)
)
){
value=
Number(
cell_value.average
);
}else if(
Number.isFinite(
Number(cell_value)
)
){
value=
Number(cell_value);
}
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
Month-wise comparison of average BHSC score for all zones based on actual Branch Score Card records.
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
    container.html(`
        <div class="zone-comparison-card">
            <div class="zone-comparison-header">
                <div>
                    <div class="zone-comparison-title">
                        Zone-wise Trend Compared to
                        ${frappe.utils.escape_html(
                            previous_label
                        )}
                    </div>
                    <div class="zone-comparison-subtitle">
                        ${frappe.utils.escape_html(
                            selected_label
                        )}
                        score is compared with the immediately
                        previous month's score. Only branches
                        having valid scores in both months are included.
                    </div>
                </div>
                <div class="zone-comparison-period">
                    ${frappe.utils.escape_html(
                        selected_label
                    )}
                    vs
                    ${frappe.utils.escape_html(
                        previous_label
                    )}
                </div>
            </div>
            <div class="zone-comparison-table-wrap">
                <table class="zone-comparison-table">
                    <thead>
                        <tr>
                            <th>
                                Zone
                            </th>
                            <th>
                                Constant
                            </th>
                            <th>
                                Down
                            </th>
                            <th>
                                Up
                            </th>
                            <th>
                                Grand Total
                            </th>
                        </tr>
                    </thead>
                    <tbody>
                        ${rows_html}
                    </tbody>
                </table>
            </div>
            <div class="zone-comparison-legend">
                <div class="zone-comparison-legend-item">
                    <span
                        class="zone-comparison-legend-dot"
                        style="background:#718084;">
                    </span>
                    Constant
                </div>
                <div class="zone-comparison-legend-item">
                    <span
                        class="zone-comparison-legend-dot"
                        style="background:#b45353;">
                    </span>
                    Down
                </div>
                <div class="zone-comparison-legend-item">
                    <span
                        class="zone-comparison-legend-dot"
                        style="background:#42805a;">
                    </span>
                    Up
                </div>
                <div class="zone-comparison-legend-item">
                    <span
                        class="zone-comparison-legend-dot"
                        style="background:#3a6f75;">
                    </span>
                    Grand Total
                </div>
            </div>
        </div>
    `);
}
/* =========================================================
   ZONE WISE - RENDER BACKEND RESULT
   ========================================================= */
function render_zone_wise_table(
result
){
let container=
$("#zone-wise-content");
if(!container.length){
return;
}
let periods=
Array.isArray(result.periods)
?result.periods
:[];
let zones=
Array.isArray(result.zones)
?result.zones
:[];
let data=
result.data||
{};
let grand_total=
result.grand_total||
{};
if(!periods.length){
container.html(`
<div class="zone-wise-empty">
<div class="zone-wise-empty-title">
No Trend Period Available
</div>
<div>
No valid months are available for the selected FY.
</div>
</div>
`);
return;
}
if(!zones.length){
container.html(`
<div class="zone-wise-empty">
<div class="zone-wise-empty-title">
No Zone Data Available
</div>
<div>
No actual zone mapping was found in Sahayog Branch.
</div>
</div>
`);
return;
}
let latest_period=
periods[periods.length-1]||
null;
let title_month=
latest_period
?String(
latest_period.month||
""
)
:"";
let title_year=
latest_period
?String(
latest_period.year||
""
)
:"";
let title_text=
title_month&&title_year
?`${title_month} ${title_year}`
:title_year;
let table_header_html=
periods.map(
period=>`
<th>
${frappe.utils.escape_html(
period.label||
""
)}
</th>
`
).join("");
let table_rows_html="";
zones.forEach(zone=>{
    let zone_data=
    data[zone]||
    {};
    let cells_html="";
    periods.forEach(period=>{
        let key=
        String(
            period.label||
            ""
        );
        let cell_value=
        zone_data[key];
        if(
            cell_value!==null&&
            cell_value!==undefined&&
            typeof cell_value==="object"&&
            Number.isFinite(
                Number(cell_value.average)
            )
        ){
            let average=
            Number(
                cell_value.average
            );
            let branch_count=
            Number(
                cell_value.branch_count
            )||
            0;
            cells_html+=`
            <td>
            <span
            class="zone-score-value zone-score-available"
            title="${branch_count} branch scorecard(s) used">
            ${average.toFixed(2)}
            </span>
            </td>
            `;
        }else if(
            Number.isFinite(
                Number(cell_value)
            )
        ){
            cells_html+=`
            <td>
            <span
            class="zone-score-value zone-score-available">
            ${Number(cell_value).toFixed(2)}
            </span>
            </td>
            `;
        }else{
            cells_html+=`
            <td>
            <span
            class="zone-score-value zone-score-unavailable">
            —
            </span>
            </td>
            `;
        }
    });
    table_rows_html+=`
    <tr>
    <td class="zone-name-cell">
    ${frappe.utils.escape_html(
        zone
    )}
    </td>
    ${cells_html}
    </tr>
    `;
});
/* =========================================================
   GRAND TOTAL ROW
   ========================================================= */
let grand_total_cells_html="";
periods.forEach(period=>{
    let key=
    String(
        period.label||
        ""
    );
    let total_value=
    grand_total[key];
    if(
        total_value!==null&&
        total_value!==undefined&&
        Number.isFinite(
            Number(total_value)
        )
    ){
        grand_total_cells_html+=`
        <td>
        <span
        class="zone-score-value zone-score-available">
        ${Number(total_value).toFixed(2)}
        </span>
        </td>
        `;
    }else{
        grand_total_cells_html+=`
        <td>
        <span
        class="zone-score-value zone-score-unavailable">
        —
        </span>
        </td>
        `;
    }
});
table_rows_html+=`
<tr class="grand-total-row">
<td class="grand-total-name-cell">
Grand Total
</td>
${grand_total_cells_html}
</tr>
`;
container.html(`
<div class="zone-wise-container">
<div class="zone-wise-header">
<div>
<div class="zone-wise-title">
Zone Wise BHSC Average Score and Trend – ${frappe.utils.escape_html(title_text)}
</div>
<div class="zone-wise-subtitle">
Average score is calculated from actual Branch Score Card records available for each branch in the respective zone and month.
</div>
</div>
</div>
<div class="zone-wise-table-wrap">
<table class="zone-wise-table">
<thead>
<tr>
<th>
Zone
</th>
${table_header_html}
</tr>
</thead>
<tbody>
${table_rows_html}
</tbody>
</table>
</div>
<div
id="zone-wise-trend-graph">
</div>
<div
id="zone-wise-trend-comparison">
</div>
<div class="zone-wise-footer">
Only actual scorecard records are included in the average. A dash (—) means no valid scorecard score was available for that zone/month.
</div>
</div>
`);
render_zone_wise_trend_graph(
    periods,
    zones,
    data
);
render_zone_wise_trend_comparison(
    result.trend_comparison
);
console.log(
    "Zone Wise table rendered:",
    result
);
}