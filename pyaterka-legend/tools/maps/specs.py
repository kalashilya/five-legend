# Узлы (колауты) и маршруты по радарам CS2. Координаты — проценты радара, x вправо, y вниз.
SPECS = {}

SPECS['Inferno'] = dict(file='de_inferno',
  n=dict(TS=[9, 70], tEx=[19, 66], tRamp=[27, 64], tTop=[36, 61], bnBot=[43, 56], bnMid=[46, 47], bnTop=[49.5, 42], bnCar=[51, 36.5], B=[48, 23], bBack=[43, 15],
         bE=[56, 21], constr=[56, 9], ctB=[64, 21], CTS=[79, 24], ctLow=[74.5, 40], arch=[75, 54], topMid=[69, 59], m1=[46, 64], mid=[56, 65], m2=[65, 66],
         short=[69, 72], aW=[74, 77], A=[81, 69], tLow=[27, 79], apps1=[36, 81], appsC=[47, 87], apps2=[53, 90], boiler=[59.5, 80.5], balc=[72, 83], aS=[82, 80], pit=[92, 78], lib=[89, 46], ctR=[89, 32], aN=[82, 56]),
  r=dict(TS=6, A=8, B=8, CTS=6),
  tz=['TS', 'tEx', 'tRamp', 'tTop', 'bnBot', 'm1', 'mid', 'tLow', 'apps1', 'appsC', 'apps2', 'boiler'], ctz=['CTS', 'ctB', 'ctLow', 'lib', 'bE', 'constr'],
  e=[['TS', 'tEx'], ['tEx', 'tRamp'], ['tRamp', 'tTop'], ['tTop', 'bnBot'], ['bnBot', 'bnMid'], ['bnMid', 'bnTop'], ['bnTop', 'bnCar'], ['bnCar', 'B'], ['B', 'bBack'],
     ['B', 'bE'], ['bE', 'constr'], ['bE', 'ctB'], ['ctB', 'CTS'], ['CTS', 'ctLow'], ['ctLow', 'arch'], ['arch', 'topMid'], ['topMid', 'm2'],
     ['tTop', 'm1'], ['m1', 'mid'], ['mid', 'm2'], ['m2', 'short'], ['short', 'aW'], ['aW', 'A'], ['CTS', 'ctR'], ['ctR', 'lib'], ['lib', 'aN'], ['aN', 'A'], ['arch', 'aN'],
     ['tRamp', 'tLow'], ['tLow', 'apps1'], ['apps1', 'appsC'], ['appsC', 'apps2'], ['apps2', 'boiler'], ['boiler', 'balc'], ['balc', 'aS'], ['aS', 'A'], ['aS', 'pit'], ['boiler', 'aW']],
  tr=dict(A=[['TS', 'tEx', 'tRamp', 'tTop', 'm1', 'mid', 'm2', 'short', 'aW', 'A'], ['TS', 'tEx', 'tRamp', 'tLow', 'apps1', 'appsC', 'apps2', 'boiler', 'balc', 'aS', 'A']],
          B=[['TS', 'tEx', 'tRamp', 'tTop', 'bnBot', 'bnMid', 'bnTop', 'bnCar', 'B'], ['TS', 'tEx', 'tRamp', 'tTop', 'bnBot', 'bnMid', 'bnTop', 'bnCar', 'B']], M=['TS', 'tEx', 'tRamp', 'tTop', 'm1', 'mid']),
  ct=dict(A=['CTS', 'ctR', 'lib', 'aN', 'A'], B=['CTS', 'ctB', 'bE', 'B'], M=['CTS', 'ctLow', 'arch', 'topMid']),
  lb=[['tRamp', 'Т-рампа'], ['bnMid', 'Банан'], ['bnCar', 'Машина'], ['constr', 'Стройка'], ['ctB', 'КТ'], ['arch', 'Арка'], ['topMid', 'Топ-мид'], ['mid', 'Мид'], ['short', 'Шорт'],
      ['apps1', 'Апартаменты'], ['boiler', 'Бойлер'], ['balc', 'Балкон'], ['pit', 'Яма'], ['lib', 'Библиотека']],
)

def post(p, look, s): return dict(p=p, look=look, s=s)
def rt(r, s, lurk=0): d = dict(r=r, s=s); d.update(lurk=1) if lurk else None; return d

# Inferno: CT — яма, библиотека/сайт, арка (мид), машина на банане, гробы на B; T — шорт через мид, апартаменты → балкон, банан
_IP = dict(pit=post([90, 79], [80, 80], 'A'), lib=post([86, 57], [74, 76], 'A'), site=post([83, 66], [73, 76], 'A'), arch=post([72, 55], [64, 66], 'M'), grave=post([88, 70], [80, 82], 'A'),
           car=post([51.5, 36], [46, 48], 'B'), coff=post([44, 15], [50, 34], 'B'), dark=post([57, 25], [50, 36], 'B'), constr=post([55, 11], [48, 22], 'B'))
_IB = ['tEx', 'tRamp', 'tTop', 'bnBot', 'bnMid', 'bnTop', 'bnCar', 'B']
_IM = ['tEx', 'tRamp', 'tTop', 'm1', 'mid', 'm2', 'short', 'aW', 'A']
_IA = ['tEx', 'tRamp', 'tLow', 'apps1', 'appsC', 'apps2', 'boiler', 'balc', 'aS', 'A']
SPECS['Inferno']['plan'] = dict(
  spT=[[9, 66], [11, 70], [8, 73], [12, 74], [10, 63]], spCT=[[78, 21], [81, 25], [76, 27], [83, 21], [79, 29]],
  ct=dict(S=[_IP['arch'], _IP['pit'], _IP['site'], _IP['car'], _IP['coff']], A=[_IP['lib'], _IP['pit'], _IP['site'], _IP['arch'], _IP['car']], B=[_IP['arch'], _IP['pit'], _IP['car'], _IP['coff'], _IP['dark']]),
  t=dict(A=[rt(_IM, 5), rt(_IA, 7), rt(_IA, 7), rt(_IB[:5], 4, 1), rt(_IM, 5)],
         B=[rt(_IB, 5), rt(_IB, 5), rt(_IB, 5), rt(_IM[:5], 4, 1), rt(_IB, 5)],
         S=[rt(_IM[:6], 5), rt(_IB[:6], 5), rt(_IB[:5], 4), rt(_IA[:8], 7, 1), rt(_IM[:5], 4)]),
  fs=dict(A=[[81, 69], [83.5, 65], [79, 72], [84, 72], [80, 64.5]], B=[[45, 26], [44, 18], [53, 17], [53, 24], [49, 26.5]]),
  ut=dict(A=[dict(k='smoke', p=[86, 57], dt=-1), dict(k='smoke', p=[72, 55], dt=-.9), dict(k='flash', p=[81, 68], dt=-.25), dict(k='fire', p=[89, 76], dt=.1)],
          B=[dict(k='smoke', p=[56, 21], dt=-1), dict(k='smoke', p=[44, 16], dt=-.9), dict(k='flash', p=[49, 27], dt=-.25), dict(k='fire', p=[53, 23], dt=.1)]),
  ut0=[dict(k='fire', p=[46, 48], t=2.6)])

SPECS['Ancient'] = dict(file='de_ancient',
  n=dict(TS=[48, 91.5], tTop=[47, 81], tW=[32, 75], aM1=[20, 66], aM2=[16.5, 57], aM3=[17.5, 45], aM4=[14, 33], A=[27, 23], aCT=[27, 14], ctA=[36, 10.5], CTS=[50, 8],
         midTop=[50, 25], mid=[49, 40], midBot=[48, 57], tMid=[38, 60.5], dE=[42.5, 47], donut=[31, 48.5], donutN=[28.5, 36],
         tE=[57, 84], bM1=[67, 83.5], bM2=[71.5, 75.5], bM3=[72, 60.5], bRamp=[82, 59], bLong=[86, 45], B=[77, 41], bNorth=[76.5, 24], ctB=[62, 23], cave=[64, 54], elbow=[67, 42]),
  r=dict(TS=6, A=7, B=7, CTS=6),
  tz=['TS', 'tTop', 'tW', 'aM1', 'tMid', 'tE', 'bM1', 'bM2'], ctz=['CTS', 'ctA', 'aCT', 'midTop', 'ctB', 'bNorth'],
  e=[['TS', 'tTop'], ['tTop', 'tW'], ['tW', 'aM1'], ['aM1', 'aM2'], ['aM2', 'aM3'], ['aM3', 'aM4'], ['aM4', 'A'], ['A', 'aCT'], ['aCT', 'ctA'], ['ctA', 'CTS'],
     ['CTS', 'midTop'], ['midTop', 'mid'], ['mid', 'midBot'], ['midBot', 'tMid'], ['tMid', 'tW'], ['mid', 'dE'], ['midBot', 'dE'], ['dE', 'donut'], ['donut', 'donutN'], ['donutN', 'A'],
     ['TS', 'tE'], ['tE', 'bM1'], ['bM1', 'bM2'], ['bM2', 'bM3'], ['bM3', 'bRamp'], ['bRamp', 'bLong'], ['bLong', 'B'], ['B', 'bNorth'], ['bNorth', 'ctB'], ['ctB', 'midTop'],
     ['midBot', 'cave'], ['cave', 'bM3'], ['cave', 'elbow'], ['elbow', 'B']],
  tr=dict(A=[['TS', 'tTop', 'tW', 'aM1', 'aM2', 'aM3', 'aM4', 'A'], ['TS', 'tTop', 'tW', 'tMid', 'midBot', 'dE', 'donut', 'donutN', 'A']],
          B=[['TS', 'tE', 'bM1', 'bM2', 'bM3', 'bRamp', 'bLong', 'B'], ['TS', 'tTop', 'tW', 'tMid', 'midBot', 'cave', 'elbow', 'B']], M=['TS', 'tTop', 'tW', 'tMid', 'midBot', 'mid']),
  ct=dict(A=['CTS', 'ctA', 'aCT', 'A'], B=['CTS', 'midTop', 'ctB', 'bNorth', 'B'], M=['CTS', 'midTop', 'mid']),
  lb=[['aM2', 'A-мейн'], ['donut', 'Донат'], ['mid', 'Мид'], ['midTop', 'Топ-мид'], ['tMid', 'Т-мид'], ['cave', 'Пещера'], ['bRamp', 'Рампа B'], ['bLong', 'B-лонг'], ['elbow', 'Локоть'], ['ctA', 'КТ']],
)

# Ancient: CT — мид, ящики A, окно доната, храм/КТ A, сайт B, локоть, лонг B; T — A-мейн, донат, B-мейн/рампа, пещера
_AP = dict(aSite=post([22, 25], [15, 40], 'A'), aDonut=post([28.5, 32], [30, 47], 'A'), aCT=post([29, 15.5], [24, 24], 'A'), midP=post([48, 32], [48, 56], 'M'),
           bSite=post([79, 38], [86, 52], 'B'), bElbow=post([67, 38], [64, 54], 'B'), bLongP=post([84.5, 41], [82, 58], 'B'))
_AA = ['tTop', 'tW', 'aM1', 'aM2', 'aM3', 'aM4', 'A']
_AD = ['tTop', 'tW', 'tMid', 'midBot', 'dE', 'donut', 'donutN', 'A']
_AB = ['tE', 'bM1', 'bM2', 'bM3', 'bRamp', 'bLong', 'B']
_AC = ['tTop', 'tW', 'tMid', 'midBot', 'cave', 'elbow', 'B']
SPECS['Ancient']['plan'] = dict(
  spT=[[47, 94], [50, 92], [45, 92.5], [51, 96], [46, 86]], spCT=[[48, 6], [52, 8], [46, 10], [54, 11], [50, 13]],
  ct=dict(S=[_AP['midP'], _AP['aSite'], _AP['aDonut'], _AP['bSite'], _AP['bElbow']], A=[_AP['midP'], _AP['aSite'], _AP['aDonut'], _AP['aCT'], _AP['bSite']], B=[_AP['midP'], _AP['aSite'], _AP['bSite'], _AP['bElbow'], _AP['bLongP']]),
  t=dict(A=[rt(_AD, 5), rt(_AA, 4), rt(_AA, 4), rt(_AB[:4], 3, 1), rt(_AA, 4)],
         B=[rt(_AC, 4), rt(_AB, 4), rt(_AB, 4), rt(_AA[:4], 3, 1), rt(_AB, 4)],
         S=[rt(_AD[:4], 3), rt(_AA[:4], 3), rt(_AB[:4], 3), rt(_AC[:5], 4, 1), rt(_AB[:3], 2)]),
  fs=dict(A=[[27, 23], [24, 21], [30, 21], [25, 26.5], [31, 25]], B=[[77, 41], [75, 38], [80, 38], [75, 44], [81, 43]]),
  ut=dict(A=[dict(k='smoke', p=[27, 15], dt=-1), dict(k='smoke', p=[28.5, 33], dt=-.9), dict(k='flash', p=[26, 22], dt=-.25), dict(k='fire', p=[22, 24], dt=.1)],
          B=[dict(k='smoke', p=[80, 30], dt=-1), dict(k='smoke', p=[67, 40], dt=-.9), dict(k='flash', p=[77, 40], dt=-.25), dict(k='fire', p=[80, 37], dt=.1)]),
  ut0=[dict(k='smoke', p=[50, 30], t=2.5)])

SPECS['Anubis'] = dict(file='de_anubis', dropProps=[[50.2, 56.6], [50.2, 61.2]],
  n=dict(TS=[52, 88], tW=[33, 80], bM1=[24.5, 65], bM2=[20, 57], B=[32, 50], bN=[28.5, 36], ctB=[38, 18], CTS=[50, 8],
         tMid=[50, 70], canal=[50, 59], midN=[56, 48], bCon=[40, 42], conn=[64, 38], aUnder=[73, 36.5], A=[75, 26], ctA=[60, 23.5],
         tE=[64.5, 80], aM1=[75, 71.5], aM2=[78, 58], aM3=[79, 46]),
  r=dict(TS=6, A=7, B=7, CTS=6),
  tz=['TS', 'tW', 'bM1', 'tMid', 'tE', 'aM1', 'canal'], ctz=['CTS', 'ctA', 'ctB', 'bN', 'conn'],
  e=[['TS', 'tW'], ['tW', 'bM1'], ['bM1', 'bM2'], ['bM2', 'B'], ['B', 'bN'], ['bN', 'ctB'], ['ctB', 'CTS'],
     ['TS', 'tMid'], ['tMid', 'canal'], ['canal', 'midN'], ['midN', 'bCon'], ['bCon', 'B'], ['midN', 'conn'], ['conn', 'aUnder'], ['aUnder', 'A'], ['A', 'ctA'], ['ctA', 'CTS'],
     ['TS', 'tE'], ['tE', 'aM1'], ['aM1', 'aM2'], ['aM2', 'aM3'], ['aM3', 'aUnder'], ['conn', 'ctA'], ['bCon', 'ctB']],
  tr=dict(A=[['TS', 'tE', 'aM1', 'aM2', 'aM3', 'aUnder', 'A'], ['TS', 'tMid', 'canal', 'midN', 'conn', 'aUnder', 'A']],
          B=[['TS', 'tW', 'bM1', 'bM2', 'B'], ['TS', 'tMid', 'canal', 'midN', 'bCon', 'B']], M=['TS', 'tMid', 'canal', 'midN']),
  ct=dict(A=['CTS', 'ctA', 'A'], B=['CTS', 'ctB', 'bN', 'B'], M=['CTS', 'ctA', 'conn', 'midN']),
  lb=[['bM1', 'B-мейн'], ['aM1', 'A-мейн'], ['canal', 'Каналы'], ['midN', 'Мид'], ['conn', 'Коннектор'], ['bCon', 'Двери B'], ['aUnder', 'Под A'], ['ctA', 'КТ'], ['bN', 'Лонг B']],
)

# Anubis: CT — мид, сайт A, хевен A, коннектор, сайт B, двери B, лонг B; T — A-мейн, каналы (мид), B-мейн
_NP = dict(midP=post([56, 44], [50, 60], 'M'), aSite=post([77, 27], [79, 46], 'A'), aHeav=post([70, 21], [73, 37], 'A'), aConn=post([65, 38], [56, 48], 'A'),
           bSite=post([33.5, 47], [20, 57], 'B'), bDoor=post([39, 40], [56, 48], 'B'), bLong=post([28, 38], [32, 50], 'B'))
_NA = ['tE', 'aM1', 'aM2', 'aM3', 'aUnder', 'A']
_NC = ['tMid', 'canal', 'midN', 'conn', 'aUnder', 'A']
_NB = ['tW', 'bM1', 'bM2', 'B']
_ND = ['tMid', 'canal', 'midN', 'bCon', 'B']
SPECS['Anubis']['plan'] = dict(
  spT=[[52, 91], [48, 90], [56, 90], [50, 93], [45, 89]], spCT=[[48, 6], [52, 7], [46, 10], [54, 10], [50, 12]],
  ct=dict(S=[_NP['midP'], _NP['aSite'], _NP['aHeav'], _NP['bSite'], _NP['bDoor']], A=[_NP['midP'], _NP['aSite'], _NP['aHeav'], _NP['aConn'], _NP['bSite']], B=[_NP['midP'], _NP['aSite'], _NP['bSite'], _NP['bDoor'], _NP['bLong']]),
  t=dict(A=[rt(_NC, 2), rt(_NA, 3), rt(_NA, 3), rt(_NB[:3], 2, 1), rt(_NA, 3)],
         B=[rt(_ND, 2), rt(_NB, 2), rt(_NB, 2), rt(_NA[:3], 2, 1), rt(_NB, 2)],
         S=[rt(_NC[:2], 1), rt(_NA[:3], 2), rt(_NB[:2], 1), rt(_NC[:3], 2, 1), rt(_NA[:2], 1)]),
  fs=dict(A=[[76, 24], [72, 27], [79, 22], [73, 30], [78, 29]], B=[[33.5, 51], [34, 47.5], [31, 52.5], [35.5, 50], [29.5, 46.5]]),
  ut=dict(A=[dict(k='smoke', p=[61, 23], dt=-1), dict(k='smoke', p=[64, 38], dt=-.9), dict(k='flash', p=[76, 26], dt=-.25), dict(k='fire', p=[72, 22], dt=.1)],
          B=[dict(k='smoke', p=[28, 37], dt=-1), dict(k='smoke', p=[40, 42], dt=-.9), dict(k='flash', p=[33, 49], dt=-.25), dict(k='fire', p=[35, 47], dt=.1)]),
  ut0=[dict(k='smoke', p=[50, 52], t=2.4)])
