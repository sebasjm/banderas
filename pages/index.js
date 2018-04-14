import Link from 'next/link'
import Head from 'next/head'
import Router from 'next/router'
import fetch from 'isomorphic-unfetch'

const asHashMap = (array, key = (x) => x, value = (prev, x) => true) => array.reduce( (prev,x) => ({...prev, [key(x)]: value(prev, x) }), {})

const alphabet = Array.from(
    {length: 26}, 
    (x,i) => String.fromCharCode(97 + i)
)

const alphabetMap = asHashMap(alphabet)

const dict = Array.from({length:10}, (x,i) => i).concat(alphabet).concat(alphabet.map(x => x.toUpperCase()))

const codeHash = (num) => 
    Array.from(
        {length: Math.floor(Math.log(num) / Math.log(dict.length) + 0.00000000000001)+1}, 
        (x,i) => dict[Math.floor(num / dict.length**i) % dict.length]
    ).join('')
/*
const codeHash = (num) => {
    const h = []
    let i = num
    while (i > 0) {
        h.push(dict[i % dict.length])
        i = Math.floor(i / dict.length) 
    }
    return h.join('')
}
*/

const defaultOptions = {
    lang: 'es',
    seed: codeHash(new Date()),
    size: 20
}

const Page = ({country, options, regions}) => (!country || !options) ? <div> waiting ... </div> :
    <div>
        <Head>
            <title>Banderas</title>
            <link key="1" rel="manifest" href="/static/manifest.json" />
            <link key="2" rel="apple-touch-icon" sizes="180x180" href="/static/images/apple-touch-icon.png" />
            <link key="3" rel="icon" type="image/png" sizes="32x32" href="/static/images/favicon-32x32.png" />
            <link key="4" rel="icon" type="image/png" sizes="16x16" href="/static/images/favicon-16x16.png" />
            <meta key="5" name="msapplication-TileColor" content="#603cba" />
            <meta key="6" name="theme-color" content="#2196F3" />
        </Head>
        <flag>
            <img src={`/static/flags/${country.alpha3Code}.svg`} />
        </flag>
        <letters>
            <div>
                {countryName(country, options.lang).split(' ').map( (word,i) => <word key={i}>
                    {word.split('').map( (c, i) => 
                        <character key={i}>{
                            !options[`press_${c}`] && alphabetMap[c] ? '_' : c
                        }</character>
                    )}
                </word> )}
            </div>
        </letters>
        <keyboard>
            <div>
                {alphabet.map( c => 
                    <character key={c} onClick={() => addKeyPress(country.alpha3Code, c)} >{
                        options[`press_${c}`] ? '_' : c
                    }</character>
                )}
            </div>
        </keyboard>
        <actions>
            <div>
                <action onClick={() => sayTheCountryName(country, options.lang)}>
                    <img src="/static/play.svg" />
                </action>
                <Link href={{ query: optionsAfterReload(options) }}><a><action>
                    <img src="/static/refresh.svg" />
                </action></a></Link>
            </div>
        </actions>
        <regions>
            <ul>
                <li key="world"><Link href={{ query: {...optionsAfterReload(options), region: ''} }}><a>World</a></Link></li> 
                {Object.keys(regions).map( r => 
                    <li key={r}> 
                        <Link href={{ query: {...optionsAfterReload(options), region: r} }}><a>{r}</a></Link>
                        <ul> {Object.keys(regions[r]).map( q => 
                            <li key={q}><Link href={{ query: {...optionsAfterReload(options), region: q} }}><a>{q} {regions[r][q]}</a></Link></li>
                        )}</ul>
                    </li>
                )}
            </ul>
        </regions>
        <style jsx>{`
            flag {
                padding: 10px;
            }
            flag > img {
                height: 300px;
                border: solid 1px black;
            }
            keyboard, letters, actions, flag {
                display: flex;
            }
            actions > div, letters > div, flag > img {
                margin-left: auto;
                margin-right: auto;
            }
            word {
                display: inline-block;
                margin-right: 40px;
                margin-left: 40px;
                white-space: nowrap;
            }
            keyboard > div > character {
                color: darkblue
                background: lightgray;
                border-top: 2px solid white;
                border-right: 2px solid black;
                border-bottom: 2px solid black;
                border-left: 2px solid white;
            }
            character, action {
                display: inline-block;
                text-align: center;
                vertical-align: middle;
                text-transform: uppercase;
                height: 70px;
                line-height: 70px;
                font-size: 50px;
                width: 70px;
                color: red;
                border: 1px solid black;
                background: yellow;
                border-radius: 25px;
                border-top: 2px solid moccasin;
                border-right: 4px solid orange;
                border-bottom: 4px solid orange;
                border-left: 2px solid moccasin;
                margin: 5px;
            }
        `}</style>
        <Link href="/about" ><a>about</a></Link>
    </div>

Page.getInitialProps = ({req, res, query}) => {
    const baseUrl = req ? `${req.protocol || 'http'}://${req.headers.host}` : ''
    const options = {...defaultOptions, ...query}
    const redirect = isomorphicRedirect(res)
    
    return fetch(`${baseUrl}/static/restcountries.json`)
        .then( r => r.json() )
        .then( countries => calculateGameState(countries, options, redirect) )
        .then( result => !result ? {} : result )
}

export default Page 

// CLIENT STUFF

const sayTheCountryName = (country, lang) => new Audio(`/static/sounds/${country.translations[lang] ? lang : 'en'}/${country.alpha2Code}.mp3`).play()

const addKeyPress = (country, key) => Router.push({ 
    pathname: '/',
    query: { ...Router.query, country, [`press_${key}`]: 1}
})

// CLIENT-SERVER STUFF

const isomorphicRedirect = res => ({ pathname, query = {} }) => {
    if (res) {
        res.writeHead(302, {Location: `${pathname}?${objectAsQueryString(query)}`});
        res.end();
    } else {
        Router.push({pathname, query})
    }
}

// GAME

const calculateGameState = (allCountries, options, redirect) => {
    const sortedCountries = randomize(allCountries, hashCode(options.seed) )
    const countries = options.size ? sortedCountries.slice(0, options.size) : sortedCountries
    
    const countriesFoundMap = asHashMap( countriesFound(options) )
    const countriesWithoutFound = countries.filter( c => !countriesFoundMap[c.alpha3Code] )

    if (!countriesWithoutFound.length) {
        return redirect({pathname: '/gameover'})
    }

    const countriesInRegionWithoutFound = countries
        .filter( c => c.region === options.region || c.subregion === options.region)
        .filter( c => !countriesFoundMap[c.alpha3Code] )

    const restOfCountries = !countriesInRegionWithoutFound.length ? countriesWithoutFound : countriesInRegionWithoutFound

    const country = restOfCountries.find( e => options.country === e.alpha3Code)

    if (!country) {
        return redirect(randomCountryPath(restOfCountries, options))
    }

    const keyPressedMap = asHashMap( keyPressed(options) )
    const countryHasBeenFound = countryName(country, options.lang)
        .split('')
        .filter( l => !keyPressedMap[l] && alphabetMap[l] )
        .length === 0

    if (countryHasBeenFound) {
        options[`found_${country.alpha3Code}`] = true
        return redirect(randomCountryPath(restOfCountries, optionsAfterReload(options)))
    }
    
    const regions = collectAndCountRegions(countriesWithoutFound)

    return { country, regions, options }
}

// GAME HELPERS

const countriesFound = (options) => Object.keys(options)
    .filter(k => /^found_...$/.test(k))
    .map( k => k.replace(/^found_/,''))

const keyPressed = (options) =>  Object.keys(options)
    .filter(k => /^press_.$/.test(k))
    .map( k => k.replace(/^press_/,''))

const randomCountry = (countries) => countries[Math.floor(Math.random() * countries.length)].alpha3Code

const randomCountryPath = (countries, options) => ({
    pathname: '/', 
    query: {
        ...optionsAfterReload(options), 
        country: randomCountry(countries)
    }
})

const optionsAfterReload = (options) => ({
    lang: options.lang, 
    size: options.size,
    seed: options.seed,
    region: options.region,
    ...asHashMap(Object.keys(options).filter(k => /^found_/.test(k)))
})

const countryName = (country, lang) => toSimpleCase(country.translations[lang] || country.name)

const subregionsGroupByRegion = (countries) => asHashMap(
    countries, 
    c => c.region, 
    (prev, c) => (prev[c.region] || []).concat(c)
)

const countBySubregion = (region) => asHashMap(
    region, 
    c => c.subregion, 
    (prev, c) => (prev[c.subregion] || 0) +1
)

const collectAndCountRegions = (countries) => mapObject(
    subregionsGroupByRegion(countries),
    (k, region) => countBySubregion(region)
)

// UTIL

const objectAsQueryString = obj => Object.keys(obj).reduce( (prev, k) => `${prev}&${k}=${obj[k] ? obj[k]: ''}`, '')

const toSimpleCase = (string) => string.normalize('NFD').replace(/[\u0300-\u036f]/g, "").toLocaleLowerCase()

const mapObject = (obj, func) => Object.keys(obj).reduce( (prev, x) => ({...prev, [x]: func(x, obj[x])}),{})

const randomNumber = (seed) => {
    const x = Math.sin(seed) * 10000;
    return x - Math.floor(x)
}

const splice = (array, position) => {
    const copy = [].concat(array)
    copy.splice(position, 1)
    return copy
}

const randomize = (array, seed) => {
    if (array.length < 2) return array
    const position = Math.floor(randomNumber( seed ) * array.length)
    return randomize( splice(array, position), seed+1 ).concat( array[position] )
}
/*
const randomize = (array, seed) => {
    let updatableSeed = hashCode(seed)
    return array.sort( () => {
        const x = Math.sin(updatableSeed++) * 10000;
        return .5 - x - Math.floor(x);
    } )
}
*/

const hashCode = string => string.split('').reduce( (prev,x) => (prev << 5) - prev + x.charCodeAt(0) | 0,0)
/*
const hashCode = string => {
    let h = 0, i = 0;
    while (i < string.length)
        h = (h << 5) - h + string.charCodeAt(i++) | 0;
    return h;
};
*/

