// Curated pack definitions. `scripts/build-data.ts` resolves every
// "Artist | Title" line to an iTunes track (with a 30-second preview) and
// writes the results to src/data. Edit these lists, then run `npm run data`.

export type PackCategory = 'charts' | 'decades' | 'genres';

export interface CuratedPack {
    id: string;
    title: string;
    blurb: string;
    category: Exclude<PackCategory, 'charts'>;
    /** iTunes storefront used to resolve the songs. */
    country: string;
    songs: string;
}

export interface ChartPack {
    id: string;
    title: string;
    blurb: string;
    country: string;
}

export const CHARTS: ChartPack[] = [
    { id: 'top-us', title: 'Top 100 USA', blurb: 'The most played songs in the US right now.', country: 'us' },
    { id: 'top-gb', title: 'Top 100 UK', blurb: 'What the UK has on repeat this week.', country: 'gb' },
    { id: 'top-in', title: 'Top 100 India', blurb: 'The biggest songs in India right now.', country: 'in' },
];

export const CURATED: CuratedPack[] = [
    {
        id: '60s',
        title: '60s Gold',
        blurb: 'Motown, the British Invasion and the summer of love.',
        category: 'decades',
        country: 'us',
        songs: `
The Beatles | Hey Jude
The Beatles | Here Comes the Sun
The Beatles | Twist and Shout
The Rolling Stones | (I Can't Get No) Satisfaction
The Rolling Stones | Paint It, Black
The Beach Boys | Good Vibrations
The Beach Boys | Wouldn't It Be Nice
The Supremes | You Can't Hurry Love
The Supremes | Baby Love
The Temptations | My Girl
Marvin Gaye | I Heard It Through the Grapevine
Marvin Gaye & Tammi Terrell | Ain't No Mountain High Enough
Aretha Franklin | Respect
Otis Redding | (Sittin' On) The Dock of the Bay
Ben E. King | Stand By Me
Sam Cooke | A Change Is Gonna Come
The Ronettes | Be My Baby
The Righteous Brothers | You've Lost That Lovin' Feelin'
The Animals | House of the Rising Sun
The Kinks | You Really Got Me
The Who | My Generation
The Doors | Light My Fire
The Jimi Hendrix Experience | All Along the Watchtower
Jefferson Airplane | Somebody to Love
The Mamas & The Papas | California Dreamin'
Simon & Garfunkel | The Sound of Silence
Simon & Garfunkel | Mrs. Robinson
The Monkees | I'm a Believer
The Turtles | Happy Together
Creedence Clearwater Revival | Proud Mary
Creedence Clearwater Revival | Bad Moon Rising
Elvis Presley | Can't Help Falling in Love
Elvis Presley | Suspicious Minds
Frank Sinatra | Strangers in the Night
Nancy Sinatra | These Boots Are Made for Walkin'
Louis Armstrong | What a Wonderful World
Johnny Cash | Ring of Fire
Bob Dylan | Like a Rolling Stone
The Byrds | Mr. Tambourine Man
The Zombies | Time of the Season
Martha Reeves & The Vandellas | Dancing in the Street
Frankie Valli | Can't Take My Eyes Off You
Dusty Springfield | Son of a Preacher Man
The Box Tops | The Letter
Steppenwolf | Born to Be Wild
The Kingsmen | Louie Louie
Chubby Checker | The Twist
The Shirelles | Will You Love Me Tomorrow
Etta James | At Last
David Bowie | Space Oddity
`,
    },
    {
        id: '70s',
        title: '70s Classics',
        blurb: 'Disco, stadium rock and soul at its peak.',
        category: 'decades',
        country: 'us',
        songs: `
Queen | Bohemian Rhapsody
Queen | Don't Stop Me Now
Queen | We Will Rock You
ABBA | Dancing Queen
ABBA | Mamma Mia
Bee Gees | Stayin' Alive
Bee Gees | How Deep Is Your Love
Gloria Gaynor | I Will Survive
Donna Summer | Hot Stuff
Earth, Wind & Fire | September
Chic | Le Freak
Village People | Y.M.C.A.
Led Zeppelin | Stairway to Heaven
Led Zeppelin | Whole Lotta Love
Pink Floyd | Another Brick in the Wall, Pt. 2
Eagles | Hotel California
Fleetwood Mac | Dreams
Fleetwood Mac | Go Your Own Way
Elton John | Rocket Man (I Think It's Going to Be a Long, Long Time)
Elton John | Tiny Dancer
David Bowie | Heroes
Lynyrd Skynyrd | Sweet Home Alabama
Boston | More Than a Feeling
Kansas | Carry On Wayward Son
Blondie | Heart of Glass
The Clash | London Calling
Ramones | Blitzkrieg Bop
Stevie Wonder | Superstition
Stevie Wonder | Sir Duke
Marvin Gaye | Let's Get It On
Bill Withers | Ain't No Sunshine
Bill Withers | Lean on Me
Al Green | Let's Stay Together
The Jackson 5 | ABC
The Jackson 5 | I Want You Back
Carly Simon | You're So Vain
Don McLean | American Pie
John Lennon | Imagine
Lou Reed | Walk on the Wild Side
Bob Marley & The Wailers | Is This Love
Bob Marley & The Wailers | Three Little Birds
KC and the Sunshine Band | That's the Way (I Like It)
The O'Jays | Love Train
Electric Light Orchestra | Mr. Blue Sky
Supertramp | The Logical Song
Billy Joel | Piano Man
Bruce Springsteen | Born to Run
AC/DC | Highway to Hell
Steve Miller Band | The Joker
Thin Lizzy | The Boys Are Back in Town
Aerosmith | Dream On
Simon & Garfunkel | Bridge Over Troubled Water
Rod Stewart | Da Ya Think I'm Sexy?
`,
    },
    {
        id: '80s',
        title: '80s Hits',
        blurb: 'Synths, power ballads and the birth of MTV.',
        category: 'decades',
        country: 'us',
        songs: `
Michael Jackson | Billie Jean
Michael Jackson | Beat It
Michael Jackson | Thriller
Madonna | Like a Prayer
Madonna | Material Girl
Prince | Purple Rain
Prince | When Doves Cry
Whitney Houston | I Wanna Dance with Somebody (Who Loves Me)
Cyndi Lauper | Girls Just Want to Have Fun
a-ha | Take On Me
Journey | Don't Stop Believin'
TOTO | Africa
Bon Jovi | Livin' on a Prayer
Guns N' Roses | Sweet Child O' Mine
Europe | The Final Countdown
Survivor | Eye of the Tiger
Queen | Another One Bites the Dust
Queen & David Bowie | Under Pressure
Tears for Fears | Everybody Wants to Rule the World
Eurythmics | Sweet Dreams (Are Made of This)
Simple Minds | Don't You (Forget About Me)
Dexys Midnight Runners | Come On Eileen
Wham! | Wake Me Up Before You Go-Go
George Michael | Faith
Rick Astley | Never Gonna Give You Up
Kenny Loggins | Footloose
Bonnie Tyler | Total Eclipse of the Heart
Phil Collins | In the Air Tonight
Daryl Hall & John Oates | You Make My Dreams
Lionel Richie | Hello
Lionel Richie | All Night Long (All Night)
The Police | Every Breath You Take
Duran Duran | Hungry Like the Wolf
Depeche Mode | Just Can't Get Enough
New Order | Blue Monday
The Cure | Just Like Heaven
The Bangles | Walk Like an Egyptian
Def Leppard | Pour Some Sugar On Me
Billy Idol | White Wedding
Pat Benatar | Love Is a Battlefield
Joan Jett & The Blackhearts | I Love Rock 'N Roll
Van Halen | Jump
Bruce Springsteen | Dancing in the Dark
Bruce Springsteen | Born in the U.S.A.
U2 | With or Without You
Dire Straits | Money for Nothing
Kim Wilde | Kids in America
Soft Cell | Tainted Love
The Human League | Don't You Want Me
Ray Parker Jr. | Ghostbusters
Huey Lewis & The News | The Power of Love
Belinda Carlisle | Heaven Is a Place on Earth
Kate Bush | Running Up That Hill (A Deal with God)
Bobby McFerrin | Don't Worry, Be Happy
Starship | We Built This City
`,
    },
    {
        id: '90s',
        title: '90s Throwback',
        blurb: 'Grunge, girl power, boy bands and Britpop.',
        category: 'decades',
        country: 'us',
        songs: `
Nirvana | Smells Like Teen Spirit
Oasis | Wonderwall
Oasis | Don't Look Back in Anger
Radiohead | Creep
R.E.M. | Losing My Religion
Pearl Jam | Alive
Red Hot Chili Peppers | Under the Bridge
Green Day | Basket Case
The Verve | Bitter Sweet Symphony
Blur | Song 2
The Cranberries | Zombie
Alanis Morissette | Ironic
No Doubt | Don't Speak
Spice Girls | Wannabe
Backstreet Boys | I Want It That Way
Backstreet Boys | Everybody (Backstreet's Back)
Britney Spears | ...Baby One More Time
Christina Aguilera | Genie in a Bottle
TLC | No Scrubs
TLC | Waterfalls
Destiny's Child | Say My Name
Mariah Carey | Fantasy
Whitney Houston | I Will Always Love You
Celine Dion | My Heart Will Go On
Boyz II Men | End of the Road
Ace of Base | The Sign
Aqua | Barbie Girl
Haddaway | What Is Love
Eiffel 65 | Blue (Da Ba Dee)
Vengaboys | Boom, Boom, Boom, Boom!!
Los del Rio | Macarena
Ricky Martin | Livin' la Vida Loca
Lou Bega | Mambo No. 5 (A Little Bit Of...)
Coolio | Gangsta's Paradise
2Pac | California Love
The Notorious B.I.G. | Juicy
Will Smith | Gettin' Jiggy wit It
Will Smith | Men in Black
Vanilla Ice | Ice Ice Baby
MC Hammer | U Can't Touch This
Dr. Dre | Still D.R.E.
Fugees | Killing Me Softly with His Song
Lauryn Hill | Doo Wop (That Thing)
Shania Twain | Man! I Feel Like a Woman!
Savage Garden | Truly Madly Deeply
Third Eye Blind | Semi-Charmed Life
Smash Mouth | All Star
Chumbawamba | Tubthumping
Hanson | MMMBop
Natalie Imbruglia | Torn
Goo Goo Dolls | Iris
Sixpence None the Richer | Kiss Me
Semisonic | Closing Time
`,
    },
    {
        id: '2000s',
        title: '2000s Anthems',
        blurb: 'Ringtone rap, pop punk and the iPod era.',
        category: 'decades',
        country: 'us',
        songs: `
Beyoncé | Crazy in Love
Beyoncé | Single Ladies (Put a Ring on It)
Rihanna | Umbrella
OutKast | Hey Ya!
OutKast | Ms. Jackson
The Killers | Mr. Brightside
The White Stripes | Seven Nation Army
Coldplay | Viva la Vida
Coldplay | Yellow
Linkin Park | In the End
Linkin Park | Numb
Eminem | Lose Yourself
Eminem | Without Me
50 Cent | In da Club
Usher | Yeah!
Nelly | Hot in Herre
Nelly Furtado | Promiscuous
Justin Timberlake | SexyBack
Gwen Stefani | Hollaback Girl
Britney Spears | Toxic
Kelly Clarkson | Since U Been Gone
Avril Lavigne | Complicated
Avril Lavigne | Sk8er Boi
P!nk | Get the Party Started
Shakira | Hips Don't Lie
Black Eyed Peas | I Gotta Feeling
Black Eyed Peas | Where Is the Love?
Lady Gaga | Poker Face
Lady Gaga | Just Dance
Katy Perry | I Kissed a Girl
Kanye West | Gold Digger
Kanye West | Stronger
Amy Winehouse | Rehab
Amy Winehouse | Back to Black
Gnarls Barkley | Crazy
Daft Punk | One More Time
Daft Punk | Harder, Better, Faster, Stronger
Green Day | Boulevard of Broken Dreams
My Chemical Romance | Welcome to the Black Parade
Fall Out Boy | Sugar, We're Goin Down
Panic! At the Disco | I Write Sins Not Tragedies
Paramore | Misery Business
Snow Patrol | Chasing Cars
James Blunt | You're Beautiful
Leona Lewis | Bleeding Love
Alicia Keys | Fallin'
Destiny's Child | Survivor
Nickelback | How You Remind Me
Kings of Leon | Use Somebody
MGMT | Kids
Taylor Swift | Love Story
The Fray | How to Save a Life
Sean Paul | Temperature
`,
    },
    {
        id: '2010s',
        title: '2010s Hits',
        blurb: 'Streaming takes over. EDM drops, viral dances and pop at full volume.',
        category: 'decades',
        country: 'us',
        songs: `
Adele | Rolling in the Deep
Adele | Someone Like You
Adele | Hello
Ed Sheeran | Shape of You
Ed Sheeran | Thinking Out Loud
Mark Ronson | Uptown Funk
Bruno Mars | Just the Way You Are
Bruno Mars | Locked Out of Heaven
Pharrell Williams | Happy
Daft Punk | Get Lucky
Gotye | Somebody That I Used to Know
Carly Rae Jepsen | Call Me Maybe
PSY | Gangnam Style
LMFAO | Party Rock Anthem
Rihanna | We Found Love
Rihanna | Diamonds
Katy Perry | Roar
Katy Perry | Firework
Lady Gaga | Bad Romance
Taylor Swift | Shake It Off
Taylor Swift | Blank Space
Justin Bieber | Sorry
Luis Fonsi & Daddy Yankee | Despacito
The Weeknd | Can't Feel My Face
The Weeknd | Starboy
Drake | Hotline Bling
Drake | God's Plan
Kendrick Lamar | HUMBLE.
Post Malone & Swae Lee | Sunflower
Lil Nas X | Old Town Road
Billie Eilish | bad guy
Imagine Dragons | Radioactive
Imagine Dragons | Believer
OneRepublic | Counting Stars
Avicii | Wake Me Up
Calvin Harris | Summer
The Chainsmokers | Closer
Major Lazer & DJ Snake | Lean On
Sia | Chandelier
Sia | Cheap Thrills
Lorde | Royals
Hozier | Take Me to Church
Arctic Monkeys | Do I Wanna Know?
Foster the People | Pumped Up Kicks
fun. | We Are Young
Macklemore & Ryan Lewis | Thrift Shop
Meghan Trainor | All About That Bass
Ariana Grande | thank u, next
Ariana Grande | 7 rings
Dua Lipa | New Rules
Shawn Mendes & Camila Cabello | Señorita
Camila Cabello | Havana
Twenty One Pilots | Stressed Out
Maroon 5 | Moves Like Jagger
Wiz Khalifa | See You Again
`,
    },
    {
        id: '2020s',
        title: 'Hits of the 2020s',
        blurb: 'The songs that ruled the decade so far.',
        category: 'decades',
        country: 'us',
        songs: `
The Weeknd | Blinding Lights
The Weeknd | Save Your Tears
Dua Lipa | Levitating
Dua Lipa | Don't Start Now
Harry Styles | As It Was
Harry Styles | Watermelon Sugar
Olivia Rodrigo | drivers license
Olivia Rodrigo | good 4 u
Olivia Rodrigo | vampire
Miley Cyrus | Flowers
Taylor Swift | Anti-Hero
Taylor Swift | Cruel Summer
Billie Eilish | What Was I Made For?
Billie Eilish | BIRDS OF A FEATHER
Sabrina Carpenter | Espresso
Sabrina Carpenter | Please Please Please
Chappell Roan | Good Luck, Babe!
Chappell Roan | HOT TO GO!
Benson Boone | Beautiful Things
Teddy Swims | Lose Control
Hozier | Too Sweet
Doja Cat | Say So
Doja Cat | Paint The Town Red
SZA | Kill Bill
SZA | Snooze
Glass Animals | Heat Waves
The Kid LAROI & Justin Bieber | STAY
Lil Nas X | MONTERO (Call Me By Your Name)
Bad Bunny | Tití Me Preguntó
Kendrick Lamar | Not Like Us
Kendrick Lamar & SZA | luther
Lady Gaga & Bruno Mars | Die With A Smile
ROSÉ & Bruno Mars | APT.
Gracie Abrams | That's So True
Tate McRae | greedy
Lizzo | About Damn Time
Måneskin | Beggin'
Morgan Wallen | Last Night
Zach Bryan | I Remember Everything
Post Malone | I Had Some Help
Tones And I | Dance Monkey
Ed Sheeran | Bad Habits
BTS | Dynamite
Steve Lacy | Bad Habit
Cardi B | WAP
Djo | End of Beginning
Alex Warren | Ordinary
Lady Gaga | Abracadabra
HUNTR/X | Golden
Shaboozey | A Bar Song (Tipsy)
Jack Harlow | First Class
`,
    },
    {
        id: 'rock',
        title: 'Rock Legends',
        blurb: 'Riffs you know from the first chord.',
        category: 'genres',
        country: 'us',
        songs: `
AC/DC | Back In Black
AC/DC | Thunderstruck
Led Zeppelin | Immigrant Song
Deep Purple | Smoke on the Water
Black Sabbath | Paranoid
The Rolling Stones | Start Me Up
The Who | Baba O'Riley
Guns N' Roses | Welcome to the Jungle
Metallica | Enter Sandman
Metallica | Nothing Else Matters
Bon Jovi | It's My Life
Aerosmith | I Don't Want to Miss a Thing
Nirvana | Come As You Are
Foo Fighters | Everlong
Foo Fighters | The Pretender
Red Hot Chili Peppers | Californication
Red Hot Chili Peppers | Can't Stop
The Killers | Somebody Told Me
Arctic Monkeys | I Bet You Look Good On the Dancefloor
Muse | Uprising
Muse | Supermassive Black Hole
Kings of Leon | Sex on Fire
The Strokes | Last Nite
Franz Ferdinand | Take Me Out
Rage Against the Machine | Killing in the Name
System of a Down | Chop Suey!
Soundgarden | Black Hole Sun
Alice In Chains | Man in the Box
Stone Temple Pilots | Plush
blink-182 | All the Small Things
Green Day | American Idiot
The Offspring | Self Esteem
Weezer | Buddy Holly
ZZ Top | Sharp Dressed Man
Van Halen | Panama
Scorpions | Rock You Like a Hurricane
Bon Jovi | You Give Love a Bad Name
Journey | Separate Ways (Worlds Apart)
Heart | Barracuda
The Police | Roxanne
Dire Straits | Sultans of Swing
Pink Floyd | Wish You Were Here
Fleetwood Mac | The Chain
Creedence Clearwater Revival | Fortunate Son
The Jimi Hendrix Experience | Purple Haze
Cream | Sunshine of Your Love
The Black Keys | Lonely Boy
Queens of the Stone Age | No One Knows
Audioslave | Like a Stone
Linkin Park | Faint
Pearl Jam | Even Flow
`,
    },
    {
        id: 'hiphop',
        title: 'Hip-Hop Essentials',
        blurb: 'From the golden age to the streaming era.',
        category: 'genres',
        country: 'us',
        songs: `
Eminem | The Real Slim Shady
Dr. Dre | Forgot About Dre
Snoop Dogg | Drop It Like It's Hot
2Pac | Changes
The Notorious B.I.G. | Hypnotize
Nas | N.Y. State of Mind
Wu-Tang Clan | C.R.E.A.M.
JAY-Z | Empire State of Mind
Kanye West | POWER
Kanye West | Heartless
Kendrick Lamar | Swimming Pools (Drank)
Kendrick Lamar | Alright
Kendrick Lamar | DNA.
Drake | Started From the Bottom
Drake | One Dance
Travis Scott | SICKO MODE
Travis Scott | goosebumps
J. Cole | No Role Modelz
Post Malone | Congratulations
Migos | Bad and Boujee
Cardi B | Bodak Yellow
Nicki Minaj | Super Bass
Nicki Minaj | Starships
Lil Wayne | A Milli
Lil Wayne | Lollipop
T.I. | Whatever You Like
Kid Cudi | Day 'N' Nite
Childish Gambino | Redbone
Childish Gambino | This Is America
Mac Miller | Self Care
Juice WRLD | Lucid Dreams
XXXTENTACION | SAD!
Lil Uzi Vert | XO Tour Llif3
Future | Mask Off
21 Savage | a lot
Megan Thee Stallion | Savage
DMX | X Gon' Give It to Ya
Missy Elliott | Get Ur Freak On
Missy Elliott | Work It
OutKast | Roses
Run-DMC | It's Tricky
Beastie Boys | Sabotage
Beastie Boys | (You Gotta) Fight for Your Right (To Party!)
Salt-N-Pepa | Push It
House of Pain | Jump Around
Cypress Hill | Insane in the Brain
Naughty By Nature | Hip Hop Hooray
A Tribe Called Quest | Can I Kick It?
Mobb Deep | Shook Ones, Pt. II
Eminem | Mockingbird
`,
    },
    {
        id: 'rnb',
        title: 'R&B Slow Jams',
        blurb: 'Smooth vocals, late nights and big feelings.',
        category: 'genres',
        country: 'us',
        songs: `
Usher | Burn
Alicia Keys | No One
Alicia Keys | If I Ain't Got You
Beyoncé | Halo
Beyoncé | Love On Top
Frank Ocean | Thinkin Bout You
Frank Ocean | Pink + White
The Weeknd | The Hills
SZA | Good Days
Daniel Caesar | Get You
Khalid | Location
Silk Sonic | Leave the Door Open
Brandy & Monica | The Boy Is Mine
Aaliyah | Try Again
Ginuwine | Pony
Mary J. Blige | Family Affair
Lauryn Hill | Ex-Factor
D'Angelo | Untitled (How Does It Feel)
Ne-Yo | So Sick
Chris Brown | With You
Mario | Let Me Love You
John Legend | All of Me
Miguel | Adorn
Marvin Gaye | Sexual Healing
Luther Vandross | Never Too Much
Sade | Smooth Operator
Sade | No Ordinary Love
Prince | Kiss
Toni Braxton | Un-Break My Heart
Amy Winehouse | Valerie
Ashanti | Foolish
Ciara | Goodies
Janet Jackson | That's the Way Love Goes
Jodeci | Come and Talk to Me
En Vogue | Don't Let Go (Love)
Rihanna | Love On The Brain
Destiny's Child | Bills, Bills, Bills
Brent Faiyaz | Dead Man Walking
Giveon | Heartbreak Anniversary
Summer Walker | Girls Need Love
Bruno Mars | Versace on the Floor
H.E.R. | Best Part
`,
    },
    {
        id: 'dance',
        title: 'Dance Floor',
        blurb: 'House, EDM and club classics built for the drop.',
        category: 'genres',
        country: 'us',
        songs: `
Avicii | Levels
Avicii | The Nights
Avicii | Hey Brother
Swedish House Mafia | Don't You Worry Child
David Guetta | Titanium
David Guetta | When Love Takes Over
Calvin Harris | Feel So Close
Calvin Harris & Dua Lipa | One Kiss
Calvin Harris | This Is What You Came For
Martin Garrix | Animals
Zedd | Clarity
Zedd, Maren Morris & Grey | The Middle
Marshmello & Bastille | Happier
Alan Walker | Faded
Kygo & Selena Gomez | It Ain't Me
The Chainsmokers | Don't Let Me Down
Clean Bandit | Rather Be
Disclosure | Latch
Daft Punk | Around the World
Fatboy Slim | Praise You
The Prodigy | Firestarter
The Chemical Brothers | Hey Boy Hey Girl
Darude | Sandstorm
Eric Prydz | Call on Me
Stardust | Music Sounds Better With You
Modjo | Lady (Hear Me Tonight)
Robin S | Show Me Love
Snap! | Rhythm Is a Dancer
Corona | The Rhythm of the Night
Duck Sauce | Barbra Streisand
Benny Benassi | Satisfaction
Bob Sinclar | Love Generation
Lost Frequencies | Are You With Me
Robin Schulz | Prayer in C
Felix Jaehn | Ain't Nobody (Loves Me Better)
Tiësto | The Business
Peggy Gou | (It Goes Like) Nanana
Fred again.. | Delilah (pull me out of this)
Black Eyed Peas, Shakira & David Guetta | DON'T YOU WORRY
Skrillex | Bangarang
deadmau5 | Ghosts 'n' Stuff
Calvin Harris & Disciples | How Deep Is Your Love
`,
    },
    {
        id: 'indie',
        title: 'Indie & Alternative',
        blurb: 'Festival favourites and bedroom-pop anthems.',
        category: 'genres',
        country: 'us',
        songs: `
Arctic Monkeys | 505
Arctic Monkeys | R U Mine?
The Strokes | Reptilia
Tame Impala | The Less I Know the Better
MGMT | Electric Feel
Vampire Weekend | A-Punk
Phoenix | 1901
Florence + The Machine | Dog Days Are Over
Two Door Cinema Club | What You Know
The Lumineers | Ho Hey
Of Monsters and Men | Little Talks
Cage the Elephant | Ain't No Rest for the Wicked
The Neighbourhood | Sweater Weather
Lana Del Rey | Video Games
Lana Del Rey | Summertime Sadness
Lorde | Green Light
Bon Iver | Skinny Love
The xx | Intro
Cigarettes After Sex | Apocalypse
Mitski | My Love Mine All Mine
Gorillaz | Feel Good Inc.
Gorillaz | Clint Eastwood
Radiohead | Karma Police
Radiohead | No Surprises
Pixies | Where Is My Mind?
The Smiths | There Is a Light That Never Goes Out
Joy Division | Love Will Tear Us Apart
Modest Mouse | Float On
The Postal Service | Such Great Heights
Yeah Yeah Yeahs | Heads Will Roll
Arcade Fire | Wake Up
alt-J | Breezeblocks
Portugal. The Man | Feel It Still
WALK THE MOON | Shut Up and Dance
The 1975 | Somebody Else
The 1975 | Chocolate
Lord Huron | The Night We Met
Vance Joy | Riptide
Mac DeMarco | Chamber of Reflection
Wallows | Are You Bored Yet?
Glass Animals | Gooey
Hozier | Work Song
Phoebe Bridgers | Motion Sickness
Tame Impala | Let It Happen
`,
    },
    {
        id: 'movies',
        title: 'Movie Magic',
        blurb: 'Soundtrack hits and themes from the big screen.',
        category: 'genres',
        country: 'us',
        songs: `
Kenny Loggins | Danger Zone
Bill Medley & Jennifer Warnes | (I've Had) The Time of My Life
Irene Cara | Fame
Lady Gaga & Bradley Cooper | Shallow
Idina Menzel | Let It Go
Auli'i Cravalho | How Far I'll Go
Elton John | Can You Feel the Love Tonight
Justin Timberlake | CAN'T STOP THE FEELING!
Billie Eilish | No Time To Die
Adele | Skyfall
Shirley Bassey | Goldfinger
Wings | Live and Let Die
Bryan Adams | (Everything I Do) I Do It for You
Seal | Kiss from a Rose
Berlin | Take My Breath Away
Keala Settle | This Is Me
Ryan Gosling & Emma Stone | City of Stars
John Travolta & Olivia Newton-John | You're the One That I Want
The Proclaimers | I'm Gonna Be (500 Miles)
Stealers Wheel | Stuck in the Middle with You
Blue Swede | Hooked on a Feeling
Redbone | Come and Get Your Love
Gary Jules | Mad World
The Rembrandts | I'll Be There for You
Hans Zimmer | Time
Hans Zimmer | Cornfield Chase
John Williams | Hedwig's Theme
Klaus Badelt | He's a Pirate
Lalo Schifrin | Mission: Impossible Theme
Ennio Morricone | The Good, the Bad and the Ugly
Billie Eilish | What Was I Made For?
Carolina Gaitán, Mauro Castillo, Adassa, Rhenzy Feliz, Diane Guerrero, Stephanie Beatriz & Encanto Cast | We Don't Talk About Bruno
Survivor | Eye of the Tiger
Simple Minds | Don't You (Forget About Me)
Ray Parker Jr. | Ghostbusters
Celine Dion | My Heart Will Go On
Whitney Houston | I Will Always Love You
Kenny Loggins | Footloose
Eminem | Lose Yourself
Wiz Khalifa | See You Again
HUNTR/X | Golden
`,
    },
    {
        id: 'bollywood',
        title: 'Bollywood Hits',
        blurb: 'Filmi classics and modern chartbusters.',
        category: 'genres',
        country: 'in',
        songs: `
Pritam, Arijit Singh & Amitabh Bhattacharya | Kesariya
Arijit Singh | Tum Hi Ho
Arijit Singh | Channa Mereya
Pritam & Arijit Singh | Apna Bana Le
Alka Yagnik & Arijit Singh | Agar Tum Saath Ho
Arijit Singh & Shilpa Rao | Chaleya
Arijit Singh | Satranga
Arijit Singh & Shreya Ghoshal | Tum Kya Mile
Arijit Singh | Nashe Si Chadh Gayi
Sonu Nigam | Kal Ho Naa Ho
A.R. Rahman | Jai Ho
Sukhwinder Singh & Sapna Awasthi | Chaiyya Chaiyya
Lata Mangeshkar | Lag Jaa Gale
Kishore Kumar | Mere Sapno Ki Rani
Kishore Kumar | Pal Pal Dil Ke Paas
Kumar Sanu | Ek Ladki Ko Dekha
Udit Narayan & Lata Mangeshkar | Tujhe Dekha To
Asha Bhosle | Dum Maro Dum
Asha Bhosle | Piya Tu Ab To Aaja
Mohammed Rafi | Kya Hua Tera Wada
Badshah | Genda Phool
Yo Yo Honey Singh | Blue Eyes
Yo Yo Honey Singh | Lungi Dance
Neha Kakkar | Dilbar
Benny Dayal & Shefali Alvares | Badtameez Dil
Sukhwinder Singh | Chak De India
A.R. Rahman, Javed Ali & Mohit Chauhan | Kun Faya Kun
Atif Aslam | Pehli Nazar Mein
Atif Aslam | Jeena Jeena
KK & Shilpa Rao | Khuda Jaane
Rahat Fateh Ali Khan | Tere Mast Mast Do Nain
Sachet Tandon | Bekhayali
Jubin Nautiyal & Asees Kaur | Raataan Lambiyan
Shankar Mahadevan | Dil Chahta Hai
Alisha Chinai, Shankar Mahadevan & Javed Ali | Kajra Re
Sunidhi Chauhan & Vishal Dadlani | Sheila Ki Jawani
Mamta Sharma | Munni Badnaam Hui
Akon & Hamsika Iyer | Chammak Challo
Rahul Sipligunj & Kaala Bhairava | Naatu Naatu
Arijit Singh | Jhoome Jo Pathaan
Madhubanti Bagchi & Divya Kumar | Aaj Ki Raat
Karan Aujla | Tauba Tauba
Mohit Chauhan | Tum Se Hi
Sonu Nigam | Abhi Mujh Mein Kahin
Shreya Ghoshal | Ghar More Pardesiya
Faheem Abdullah | Ishq
Vishal Mishra | Pehle Bhi Main
Shaan & Sunidhi Chauhan | Chand Sifarish
`,
    },
    {
        id: 'punjabi',
        title: 'Punjabi & Desi Pop',
        blurb: 'Bhangra bangers and the new wave of desi artists.',
        category: 'genres',
        country: 'in',
        songs: `
Diljit Dosanjh | Lover
Diljit Dosanjh | G.O.A.T.
Diljit Dosanjh | Born To Shine
AP Dhillon | Brown Munde
AP Dhillon | Excuses
AP Dhillon | With You
Karan Aujla | Softly
Sidhu Moose Wala | 295
Sidhu Moose Wala | The Last Ride
Shubh | Still Rollin
Shubh | Cheques
Guru Randhawa | Lahore
Guru Randhawa | High Rated Gabru
Harrdy Sandhu | Bijlee Bijlee
Harrdy Sandhu | Naah
Daler Mehndi | Tunak Tunak Tun
Panjabi MC | Mundian To Bach Ke
Imran Khan | Amplifier
Imran Khan | Satisfya
Ammy Virk | Qismat
B Praak | Filhall
King | Maan Meri Jaan
Anuv Jain | Husn
Anuv Jain | Baarishein
DIVINE | Mere Gully Mein
Hanumankind | Big Dawgs
Yo Yo Honey Singh | Millionaire
Prateek Kuhad | cold/mess
Badshah | Paani Paani
Jasleen Royal | Din Shagna Da
Karan Aujla | Wavy
Seedhe Maut | Nanchaku
`,
    },
    {
        id: 'kpop',
        title: 'K-Pop Stans',
        blurb: 'Idols, comebacks and global megahits.',
        category: 'genres',
        country: 'us',
        songs: `
BTS | Dynamite
BTS | Butter
BTS | Boy With Luv
BLACKPINK | DDU-DU DDU-DU
BLACKPINK | How You Like That
BLACKPINK | Pink Venom
BLACKPINK | JUMP
PSY | Gangnam Style
NewJeans | Hype Boy
NewJeans | Super Shy
NewJeans | Ditto
IVE | LOVE DIVE
IVE | I AM
LE SSERAFIM | ANTIFRAGILE
aespa | Next Level
aespa | Supernova
SEVENTEEN | Super
TWICE | TT
TWICE | What is Love?
Red Velvet | Psycho
Red Velvet | Red Flavor
BIGBANG | FANTASTIC BABY
2NE1 | I Am the Best
Girls' Generation | Gee
ITZY | WANNABE
(G)I-DLE | TOMBOY
Jung Kook | Seven
Jimin | Like Crazy
JENNIE | SOLO
LISA | MONEY
ILLIT | Magnetic
HUNTR/X | Golden
Saja Boys | Soda Pop
Stray Kids | S-Class
TAEYANG | Eyes, Nose, Lips
ZICO | Any Song
IU | Good Day
EXO | Growl
`,
    },
    {
        id: 'latin',
        title: 'Latin Heat',
        blurb: 'Reggaeton, salsa and pop en español.',
        category: 'genres',
        country: 'us',
        songs: `
Luis Fonsi & Daddy Yankee | Despacito
Daddy Yankee | Gasolina
Shakira | Whenever, Wherever
Shakira | Waka Waka (This Time for Africa)
Shakira | La Tortura
Bad Bunny | DtMF
Bad Bunny | Me Porto Bonito
Bad Bunny & Jhay Cortez | DÁKITI
Cardi B, Bad Bunny & J Balvin | I Like It
J Balvin & Willy William | Mi Gente
KAROL G & Shakira | TQG
KAROL G | PROVENZA
ROSALÍA | DESPECHÁ
ROSALÍA | MALAMENTE
Maluma | Hawái
Enrique Iglesias | Bailando
Marc Anthony | Vivir Mi Vida
Selena | Bidi Bidi Bom Bom
Santana | Smooth
Juanes | La Camisa Negra
Manu Chao | Me Gustas Tu
Ritchie Valens | La Bamba
Eslabon Armado & Peso Pluma | Ella Baila Sola
Grupo Frontera & Bad Bunny | un x100to
Anitta | Envolver
Daddy Yankee | Con Calma
Romeo Santos | Propuesta Indecente
Aventura | Obsesión
Carlos Vives & Shakira | La Bicicleta
Danny Ocean | Me Rehúso
CNCO | Reggaetón Lento (Bailemos)
Shakira & Bizarrap | Bzrp Music Sessions, Vol. 53
Ricky Martin | La Copa de la Vida
Gloria Estefan | Conga
Pitbull | Give Me Everything
Feid | Luna
`,
    },
    {
        id: 'country',
        title: 'Country Roads',
        blurb: 'Honky-tonk heroes, new Nashville and everything between.',
        category: 'genres',
        country: 'us',
        songs: `
Dolly Parton | Jolene
Dolly Parton | 9 to 5
Johnny Cash | Folsom Prison Blues
Johnny Cash | Hurt
Kenny Rogers | The Gambler
Willie Nelson | On the Road Again
John Denver | Take Me Home, Country Roads
Garth Brooks | Friends in Low Places
Shania Twain | You're Still the One
Shania Twain | That Don't Impress Me Much
Carrie Underwood | Before He Cheats
Taylor Swift | You Belong with Me
Luke Combs | Fast Car
Morgan Wallen | Whiskey Glasses
Chris Stapleton | Tennessee Whiskey
Zach Bryan | Something in the Orange
Lady A | Need You Now
Florida Georgia Line | Cruise
Billy Ray Cyrus | Achy Breaky Heart
Brooks & Dunn | Boot Scootin' Boogie
Tim McGraw | Live Like You Were Dying
Luke Bryan | Country Girl (Shake It for Me)
Jason Aldean | Dirt Road Anthem
Sam Hunt | Body Like a Back Road
Dan + Shay | Tequila
Beyoncé | TEXAS HOLD 'EM
Jelly Roll | Need A Favor
Lainey Wilson | Watermelon Moonshine
Miranda Lambert | The House That Built Me
Alan Jackson | Chattahoochee
Glen Campbell | Rhinestone Cowboy
Patsy Cline | Crazy
Tammy Wynette | Stand By Your Man
Rascal Flatts | Life Is a Highway
Toby Keith | Should've Been a Cowboy
Kacey Musgraves | Slow Burn
Morgan Wallen | Last Night
`,
    },
];

// Artists offered as one-tap picks in Artist mode.
export const ARTISTS: { name: string; country: string }[] = [
    { name: 'Taylor Swift', country: 'us' },
    { name: 'The Weeknd', country: 'us' },
    { name: 'Arijit Singh', country: 'in' },
    { name: 'Drake', country: 'us' },
    { name: 'Billie Eilish', country: 'us' },
    { name: 'Queen', country: 'us' },
    { name: 'The Beatles', country: 'us' },
    { name: 'Michael Jackson', country: 'us' },
    { name: 'Ed Sheeran', country: 'us' },
    { name: 'Bad Bunny', country: 'us' },
    { name: 'BTS', country: 'us' },
    { name: 'Coldplay', country: 'us' },
    { name: 'Eminem', country: 'us' },
    { name: 'Ariana Grande', country: 'us' },
    { name: 'Rihanna', country: 'us' },
    { name: 'Bruno Mars', country: 'us' },
    { name: 'Dua Lipa', country: 'us' },
    { name: 'Kendrick Lamar', country: 'us' },
    { name: 'Sabrina Carpenter', country: 'us' },
    { name: 'Diljit Dosanjh', country: 'in' },
    { name: 'A.R. Rahman', country: 'in' },
    { name: 'Linkin Park', country: 'us' },
    { name: 'ABBA', country: 'us' },
    { name: 'Lady Gaga', country: 'us' },
];

// ── Daily Challenge ─────────────────────────────────────────────────────────
//
// Each category gets its own song every day, so pop fans, hip-hop heads and
// Bollywood listeners each have a song they are likely to know. The lists are
// picked by hand, not taken from the charts: songs from DAILY_MIN_YEAR on that
// most people who follow the genre have heard, with at most two per artist so
// one star doesn't take over. Being a hit isn't enough on its own; a song
// belongs here when it is still widely recognised.
//
// The schedule is append-only (see buildDaily in build-data.ts): new lines join
// the end of a category's rotation, and removing a line here doesn't remove a
// song that is already scheduled.

export interface DailyCategorySeed {
    id: string;
    title: string;
    blurb: string;
    /** iTunes storefront used to resolve the songs. */
    country: string;
    songs: string;
}

/** Songs released before this year are left out of the Daily, even if listed. */
export const DAILY_MIN_YEAR = 2000;

export const DAILY_CATEGORIES: DailyCategorySeed[] = [
    {
        id: 'pop',
        title: 'Pop',
        blurb: 'The biggest pop songs of the last two decades.',
        country: 'us',
        songs: `
Britney Spears | Toxic
Kelly Clarkson | Since U Been Gone
Avril Lavigne | Complicated
Rihanna | Umbrella
Rihanna | Diamonds
Shakira | Hips Don't Lie
Black Eyed Peas | I Gotta Feeling
Lady Gaga | Bad Romance
Katy Perry | Firework
Katy Perry | Roar
Taylor Swift | Love Story
Taylor Swift | Shake It Off
Justin Timberlake | CAN'T STOP THE FEELING!
Gwen Stefani | Hollaback Girl
Nelly Furtado | Promiscuous
Leona Lewis | Bleeding Love
James Blunt | You're Beautiful
Adele | Rolling in the Deep
Adele | Someone Like You
Ed Sheeran | Shape of You
Ed Sheeran | Thinking Out Loud
Mark Ronson | Uptown Funk
Bruno Mars | Just the Way You Are
Pharrell Williams | Happy
Gotye | Somebody That I Used to Know
Carly Rae Jepsen | Call Me Maybe
Justin Bieber | Sorry
Sia | Chandelier
Lorde | Royals
Ariana Grande | 7 rings
Dua Lipa | New Rules
Dua Lipa | Levitating
Camila Cabello | Havana
Shawn Mendes & Camila Cabello | Señorita
Maroon 5 | Moves Like Jagger
OneRepublic | Counting Stars
Avicii | Wake Me Up
The Chainsmokers | Closer
The Weeknd | Blinding Lights
Harry Styles | As It Was
Billie Eilish | bad guy
Olivia Rodrigo | drivers license
Doja Cat | Say So
Glass Animals | Heat Waves
The Kid LAROI & Justin Bieber | STAY
Tones And I | Dance Monkey
Miley Cyrus | Flowers
Sabrina Carpenter | Espresso
Lady Gaga & Bruno Mars | Die With A Smile
ROSÉ & Bruno Mars | APT.
`,
    },
    {
        id: 'hiphop',
        title: 'Hip-Hop & R&B',
        blurb: 'Rap anthems and R&B favourites from the 2000s on.',
        country: 'us',
        songs: `
Beyoncé | Crazy in Love
Beyoncé | Halo
OutKast | Hey Ya!
Eminem | Lose Yourself
Eminem | Without Me
50 Cent | In da Club
Usher | Yeah!
Nelly | Hot in Herre
Kanye West | Gold Digger
Kanye West | Stronger
Snoop Dogg | Drop It Like It's Hot
JAY-Z | Empire State of Mind
Alicia Keys | Fallin'
Alicia Keys | No One
Ne-Yo | So Sick
Mario | Let Me Love You
Ciara | Goodies
Missy Elliott | Get Ur Freak On
Sean Paul | Temperature
Lil Wayne | Lollipop
T.I. | Whatever You Like
Kid Cudi | Day 'N' Nite
Nicki Minaj | Super Bass
Drake | Hotline Bling
Drake | God's Plan
Kendrick Lamar | HUMBLE.
Kendrick Lamar | Not Like Us
Macklemore & Ryan Lewis | Thrift Shop
Wiz Khalifa | See You Again
Post Malone & Swae Lee | Sunflower
Post Malone | Congratulations
Travis Scott | SICKO MODE
Lil Nas X | Old Town Road
Cardi B | Bodak Yellow
Migos | Bad and Boujee
Juice WRLD | Lucid Dreams
Childish Gambino | This Is America
Future | Mask Off
Megan Thee Stallion | Savage
The Weeknd | Starboy
Frank Ocean | Thinkin Bout You
John Legend | All of Me
Khalid | Location
Rihanna | Love On The Brain
Silk Sonic | Leave the Door Open
SZA | Kill Bill
Jack Harlow | First Class
`,
    },
    {
        id: 'rock',
        title: 'Rock & Indie',
        blurb: 'Guitar anthems and indie hits that filled every playlist.',
        country: 'us',
        songs: `
The Killers | Mr. Brightside
The Killers | Somebody Told Me
The White Stripes | Seven Nation Army
Coldplay | Viva la Vida
Linkin Park | In the End
Linkin Park | Numb
My Chemical Romance | Welcome to the Black Parade
Fall Out Boy | Sugar, We're Goin Down
Paramore | Misery Business
Snow Patrol | Chasing Cars
Nickelback | How You Remind Me
Kings of Leon | Use Somebody
Kings of Leon | Sex on Fire
MGMT | Kids
MGMT | Electric Feel
The Fray | How to Save a Life
Foo Fighters | The Pretender
Red Hot Chili Peppers | Can't Stop
Arctic Monkeys | I Bet You Look Good On the Dancefloor
Arctic Monkeys | Do I Wanna Know?
Muse | Uprising
Muse | Supermassive Black Hole
The Strokes | Last Nite
Franz Ferdinand | Take Me Out
The Black Keys | Lonely Boy
Queens of the Stone Age | No One Knows
Audioslave | Like a Stone
Imagine Dragons | Radioactive
Imagine Dragons | Believer
Hozier | Take Me to Church
Foster the People | Pumped Up Kicks
fun. | We Are Young
Twenty One Pilots | Stressed Out
Måneskin | Beggin'
Gorillaz | Feel Good Inc.
Gorillaz | Clint Eastwood
Vampire Weekend | A-Punk
Florence + The Machine | Dog Days Are Over
The Lumineers | Ho Hey
Of Monsters and Men | Little Talks
The Neighbourhood | Sweater Weather
Portugal. The Man | Feel It Still
WALK THE MOON | Shut Up and Dance
Lana Del Rey | Summertime Sadness
Modest Mouse | Float On
Cage the Elephant | Ain't No Rest for the Wicked
Coldplay | Paradise
Yeah Yeah Yeahs | Heads Will Roll
Phoenix | 1901
Two Door Cinema Club | What You Know
`,
    },
    {
        id: 'bollywood',
        title: 'Bollywood & Punjabi',
        blurb: 'Film hits and Punjabi bangers from across India.',
        country: 'in',
        songs: `
Pritam, Arijit Singh & Amitabh Bhattacharya | Kesariya
Arijit Singh | Tum Hi Ho
Arijit Singh | Channa Mereya
Pritam & Arijit Singh | Apna Bana Le
Alka Yagnik & Arijit Singh | Agar Tum Saath Ho
Sonu Nigam | Kal Ho Naa Ho
A.R. Rahman | Jai Ho
Badshah | Genda Phool
Yo Yo Honey Singh | Blue Eyes
Yo Yo Honey Singh | Lungi Dance
Neha Kakkar | Dilbar
Benny Dayal & Shefali Alvares | Badtameez Dil
Sukhwinder Singh | Chak De India
A.R. Rahman, Javed Ali & Mohit Chauhan | Kun Faya Kun
Atif Aslam | Pehli Nazar Mein
Atif Aslam | Jeena Jeena
KK & Shilpa Rao | Khuda Jaane
Rahat Fateh Ali Khan | Tere Mast Mast Do Nain
Sachet Tandon | Bekhayali
Jubin Nautiyal & Asees Kaur | Raataan Lambiyan
Shankar Mahadevan | Dil Chahta Hai
Alisha Chinai, Shankar Mahadevan & Javed Ali | Kajra Re
Sunidhi Chauhan & Vishal Dadlani | Sheila Ki Jawani
Mamta Sharma | Munni Badnaam Hui
Akon & Hamsika Iyer | Chammak Challo
Madhubanti Bagchi & Divya Kumar | Aaj Ki Raat
Karan Aujla | Tauba Tauba
Mohit Chauhan | Tum Se Hi
Sonu Nigam | Abhi Mujh Mein Kahin
Shaan & Sunidhi Chauhan | Chand Sifarish
Diljit Dosanjh | Lover
Diljit Dosanjh | G.O.A.T.
AP Dhillon | Brown Munde
AP Dhillon | Excuses
Sidhu Moose Wala | 295
Shubh | Still Rollin
Guru Randhawa | Lahore
Guru Randhawa | High Rated Gabru
Harrdy Sandhu | Bijlee Bijlee
Imran Khan | Satisfya
B Praak | Filhall
King | Maan Meri Jaan
Anuv Jain | Husn
Badshah | Paani Paani
`,
    },
    {
        id: 'latin',
        title: 'Latin',
        blurb: 'Reggaeton, Latin pop and the songs that crossed over.',
        country: 'us',
        songs: `
Luis Fonsi & Daddy Yankee | Despacito
Daddy Yankee | Gasolina
Daddy Yankee | Con Calma
Shakira | Whenever, Wherever
Shakira | Waka Waka (This Time for Africa)
Cardi B, Bad Bunny & J Balvin | I Like It
J Balvin & Willy William | Mi Gente
KAROL G | PROVENZA
Maluma | Hawái
Enrique Iglesias | Bailando
Marc Anthony | Vivir Mi Vida
Juanes | La Camisa Negra
Manu Chao | Me Gustas Tu
Eslabon Armado & Peso Pluma | Ella Baila Sola
Grupo Frontera & Bad Bunny | un x100to
Anitta | Envolver
Romeo Santos | Propuesta Indecente
Aventura | Obsesión
Carlos Vives & Shakira | La Bicicleta
Danny Ocean | Me Rehúso
CNCO | Reggaetón Lento (Bailemos)
Pitbull | Give Me Everything
Feid | Luna
Nicky Jam & J Balvin | X
Becky G & Natti Natasha | Sin Pijama
Sebastián Yatra | Traicionera
`,
    },
    {
        id: 'kpop',
        title: 'K-Pop',
        blurb: 'The K-pop hits that went global.',
        country: 'us',
        songs: `
BTS | Dynamite
BTS | Butter
BLACKPINK | DDU-DU DDU-DU
BLACKPINK | How You Like That
PSY | Gangnam Style
NewJeans | Hype Boy
NewJeans | Super Shy
IVE | LOVE DIVE
LE SSERAFIM | ANTIFRAGILE
aespa | Next Level
aespa | Supernova
SEVENTEEN | Super
TWICE | TT
TWICE | What is Love?
Red Velvet | Psycho
BIGBANG | FANTASTIC BABY
2NE1 | I Am the Best
Girls' Generation | Gee
ITZY | WANNABE
(G)I-DLE | TOMBOY
Jung Kook | Seven
Jimin | Like Crazy
ILLIT | Magnetic
HUNTR/X | Golden
Stray Kids | S-Class
TAEYANG | Eyes, Nose, Lips
IU | Good Day
EXO | Growl
`,
    },
];
