# Seed the local dev server with realistic entries around today
import json, urllib.request, datetime, random, uuid
API="http://localhost:4180/_functions/mdkCalendar"
def post(body):
    body["key"]="testkey123"
    r=urllib.request.Request(API, data=json.dumps(body).encode(), headers={"Content-Type":"text/plain"})
    return json.loads(urllib.request.urlopen(r).read())
t=datetime.date.today(); ws=t-datetime.timedelta(days=t.weekday())
d=lambda n: (ws+datetime.timedelta(days=n)).isoformat()
E=[]
def ev(title,people,s,e=None,typ="job",st=None,et=None,loc="",notes="",rep="none",until="",by="Kevin"):
    E.append(dict(id=uuid.uuid4().hex[:20],title=title,type=typ,people=people,start=d(s),end=d(e if e is not None else s),allDay=st is None,startTime=st or "",endTime=et or "",location=loc,notes=notes,repeat=dict(freq=rep,until=until,exdates=[]),createdBy=by))
allp=["Wally","Dustin","Kevin","Joanne","Michael","Justin","Mike","Cal","Scott","Noah","Neill","Anthony","Josh"]
ev("Safety tailgate meeting",allp,0,typ="meeting",st="07:00",et="07:30",loc="MDK shop",rep="weekly")
ev("Smith reno — 200A panel upgrade",["Dustin","Cal"],0,2,loc="1420 Altona Rd, Pickering",notes="Hydro disconnect booked Tue 8am")
ev("Service call — breaker tripping",["Mike"],1,typ="service",st="09:00",et="11:00",loc="88 Kingston Rd, Ajax")
ev("Service call — no power to garage",["Mike"],1,typ="service",st="12:30",et="14:00",loc="Whitby")
ev("ESA inspection — Brock St",["Kevin","Scott"],2,typ="inspection",st="13:00",et="14:00",loc="Brock St, Whitby")
ev("Warehouse lighting quote",["Kevin","Joanne"],3,typ="quote",st="10:00",et="11:30",loc="Ajax")
ev("",["Wally"],3,8,typ="vacation")
ev("EV charger install",["Noah","Anthony"],4,st="07:30",et="15:30",loc="Courtice")
ev("New build rough-in — Seaton",["Justin","Josh","Michael"],7,11,loc="Seaton, Pickering")
ev("WHMIS refresher",["Neill","Josh"],9,typ="training",st="12:30",et="15:00")
ev("",["Cal"],11,typ="off")
ev("Commercial fit-out — Harwood Ave",["Dustin","Scott","Neill"],-3,1,loc="Harwood Ave, Ajax")
ev("Payroll & invoicing",["Joanne"],0,typ="other",st="09:00",et="12:00",rep="weekly",loc="Office")
ev("Hot tub hookup",["Anthony"],2,st="08:00",et="12:00",loc="Pickering")
ev("Generator transfer switch",["Wally","Noah"],1,2,st="07:00",et="15:30",loc="Uxbridge")
ev("Pot lights — basement",["Michael"],3,st="08:00",et="16:00",loc="Oshawa")
ev("Panel changeover",["Justin"],4,loc="Bowmanville")
ev("Supplier meeting — Nedco",["Kevin"],8,typ="meeting",st="15:00",et="16:00")
for e in E: post({"action":"save","by":e["createdBy"],"event":e})
print(len(E),"seeded")
