window.mod_web_registerParsers({
    DATA_TRANSFORMERS: {
        '88kanqiu_playlist_transformer': function (rawList, config) {
            var playlists = {};
            if (!Array.isArray(rawList)) return playlists;

            function isBlockedRoute(item) {
                var haystack = [
                    item && item.line,
                    item && item.title,
                    item && item.name,
                    item && item.url
                ].join(' ').toLowerCase();
                return haystack.indexOf('sportsteam368') >= 0;
            }

            rawList.forEach(function (item) {
                if (!item || !item.url) return;
                if (isBlockedRoute(item)) return;
                var line = '直播线路';
                if (!playlists[line]) playlists[line] = [];
                playlists[line].push({
                    title: item.title || item.line || '播放',
                    url: item.url
                });
            });

            return playlists;
        },
        'sorani_list_transformer': function (rawData, config) {
            var records = [];
            if (Array.isArray(rawData)) {
                records = rawData;
            } else if (rawData && Array.isArray(rawData.records)) {
                records = rawData.records;
            } else if (rawData && rawData.data && Array.isArray(rawData.data.records)) {
                records = rawData.data.records;
            }

            return records.map(function (item) {
                if (!item) return null;
                var title = item.title || item.name || '';
                var update = item.latestEpisodeLabel || item.statusText || item.updateWeekdayLabel || '';
                var meta = [];
                if (item.categoryName) meta.push(item.categoryName);
                if (item.year) meta.push(item.year);
                if (item.resolutions) meta.push(item.resolutions);
                return {
                    title: title,
                    thumb: item.coverThumb || item.coverSmall || item.cover || item.coverLarge || '',
                    link: item.id ? ('https://www.sorani.net/anime/mal/' + item.id) : '',
                    update: update,
                    vote_average: item.rating || item.bangumiRating || '',
                    episodes_info: meta.join(' / ')
                };
            }).filter(function (item) {
                return item && (item.title || item.link || item.thumb);
            });
        },
        'sorani_playlist_transformer': function (rawList, config) {
            var playlists = {};
            if (!Array.isArray(rawList)) return playlists;

            rawList.forEach(function (item) {
                if (!item || !item.url) return;
                var line = item.line || '青空次元';
                if (!playlists[line]) playlists[line] = [];
                playlists[line].push({
                    title: item.title || item.name || '播放',
                    url: item.url
                });
            });

            return playlists;
        },
        vidsrc_tmdb_unified_list_transformer: function (rawData, config) {
            var tmdbKey = "4152ea09a44140809f82d68a9b2b0024";

            function detectMediaType(item) {
                if (item && (item.media_type === "movie" || item.media_type === "tv")) return item.media_type;
                if (item && (item.first_air_date || item.name || item.original_name)) return "tv";
                return "movie";
            }

            function buildTmdbDetailUrl(type, item, title, year) {
                var path = type === "tv" ? "tv" : "movie";
                var query = "?api_key=" + tmdbKey +
                    "&language=zh&append_to_response=external_ids" +
                    "&media_type=" + encodeURIComponent(type) +
                    "&title=" + encodeURIComponent(title || "");
                if (year) query += "&year=" + encodeURIComponent(year);
                return "https://api.themoviedb.org/3/" + path + "/" + item.id + query;
            }

            function normalizeRawList(rawData) {
                if (Array.isArray(rawData)) return rawData;
                if (rawData && Array.isArray(rawData.results)) return rawData.results;
                if (rawData && rawData.data && Array.isArray(rawData.data.results)) return rawData.data.results;
                if (rawData && rawData.data && Array.isArray(rawData.data.list)) return rawData.data.list;
                if (rawData && Array.isArray(rawData.list)) return rawData.list;
                return [];
            }

            var list = normalizeRawList(rawData);
            if (!list.length) return [];

            return list.map(function (item) {
                if (!item || !item.id || item.media_type === "person") return null;

                var type = detectMediaType(item);
                var title = type === "tv"
                    ? (item.name || item.original_name || item.title || "")
                    : (item.title || item.original_title || item.name || "");
                var date = type === "tv" ? item.first_air_date : item.release_date;
                var year = date ? String(date).slice(0, 4) : "";
                var typeLabel = type === "tv" ? "剧集" : "电影";

                return {
                    title: title,
                    thumb: item.poster_path ? "https://image.tmdb.org/t/p/w342" + item.poster_path : "",
                    link: buildTmdbDetailUrl(type, item, title, year),
                    update: year,
                    // update: year ? typeLabel + " " + year : typeLabel,
                    vote_average: typeof item.vote_average === "number" ? item.vote_average.toFixed(1) : "",
                    year: year,
                    tmdb_id: item.id,
                    media_type: type
                };
            }).filter(function (item) {
                return item && item.title && item.link;
            });
        },
        vidsrc_unified_playlist_transformer: function (rawData, config) {
            var playlists = {};
            var list = Array.isArray(rawData)
                ? rawData
                : (rawData && rawData.data && Array.isArray(rawData.data.list) ? rawData.data.list : (rawData && Array.isArray(rawData.list) ? rawData.list : []));

            list.forEach(function (line) {
                if (!line || !line.title || !Array.isArray(line.items) || !line.items.length) return;
                playlists[line.title] = line.items.map(function (item) {
                    var result = {};
                    var key;

                    item = item || {};

                    for (key in item) {
                        if (Object.prototype.hasOwnProperty.call(item, key)) {
                            result[key] = item[key];
                        }
                    }

                    result.title = item.title || item.name || "播放";
                    result.url = item.url || "";
                    if (!Array.isArray(result.subtitles)) result.subtitles = [];

                    return result;
                }).filter(function (item) {
                    return item.url;
                });
            });

            return playlists;
        },
        'ddys_playlist_transformer': function (rawData, config) {
            // 安全检查：如果输入不是数组，直接返回空
            if (!Array.isArray(rawData)) {
                console.error("DDys转换器错误：输入数据不是一个数组。");
                return {};
            }

            var standardItems = [];

            // 遍历原始的 tracks 数组
            rawData.forEach(function (rawItem) {
                // 【【【 在这里，我们编写硬编码的转换逻辑 】】】
                // 我们从原始数据中，挑选出我们需要的字段

                // 标题来自 'caption' 字段
                var title = rawItem.caption || '未知剧集';

                // 播放链接来自 'src0' 或 'src3' 字段
                var url = "https://cf.aston.rocks/param/referer=" + encodeURIComponent("https://ddys.pro/") + "/param/origin=" + encodeURIComponent("https://ddys.pro") + "/https://v.ddys.pro" + rawItem.src0;

                if (url) {
                    standardItems.push({
                        title: title.trim(),
                        // 使用 resolveUrl 将相对路径 /v/kr_drama/... 转换为绝对路径
                        url: resolveUrl(url, config.link)
                    });
                }
            });

            // 因为这种数据结构通常只有一个播放列表，我们给它一个默认的线路名
            if (standardItems.length > 0) {
                return {
                    "在线播放": standardItems
                };
            }

            return {}; // 如果没有解析出任何有效项目，返回空对象
        },
        'olehdtv_detail_transformer': function (rawData, config) {
            // 安全检查
            if (!rawData || !rawData.data || !Array.isArray(rawData.data.urls)) {
                console.error("Olehdtv详情转换器错误：输入数据结构不正确。");
                return {};
            }

            var standardItems = [];
            var rawItems = rawData.data.urls;

            // 遍历原始的 urls 数组
            rawItems.forEach(function (rawItem) {
                // 【【【 核心转换逻辑 】】】
                // API返回的数据已经是最终的媒体流了
                if (rawItem.url) {
                    standardItems.push({
                        title: rawItem.title,
                        url: 'https://cf.aston.rocks/' + rawItem.url // url 已经是绝对路径，无需 resolveUrl
                    });
                }
            });

            // 这个API只有一个播放列表，我们给它一个默认的线路名
            if (standardItems.length > 0) {
                return {
                    "在线播放": standardItems
                };
            }

            return {};
        },
        'olehdtv_list_transformer': function (rawData, config) {
            // 安全检查：如果输入不是数组，直接返回空数组
            if (!Array.isArray(rawData)) {
                console.error("Olehdtv转换器错误：输入数据不是一个数组。");
                return [];
            }

            var standardItems = [];

            // 遍历原始的 list 数组
            rawData.forEach(function (rawItem) {

                // 【【【 核心转换逻辑：在这里进行字段映射 】】】
                // 我们从原始数据中，挑选出我们需要的字段，并将其重命名为我们内部使用的标准字段名

                var newItem = {
                    // 我们内部用 'title'，它来自原始数据的 'name'
                    title: rawItem.name,

                    // 我们内部用 'thumb'，它来自原始数据的 'picThumb'
                    // 并且我们需要用 resolveUrl 将相对路径转换为绝对路径
                    thumb: 'https://static.olelive.com/' + (rawItem.picThumb || rawItem.pic),

                    // 我们内部用 'link'，它需要我们根据 'id' 手动拼接
                    // 假设详情页URL格式是 'https://www.olehdtv.com/index.php/vod/detail/id/{id}.html'
                    // link: resolveUrl('/index.php/vod/detail/id/' + rawItem.id + '.html', config.link),

                    link: 'https://api.olelive.com/v1/pub/vod/detail/' + rawItem.id + '/true',

                    // 【扩展字段】我们也可以把其他有用的信息带上
                    update: rawItem.remarks,
                    vote_average: rawItem.score,
                    year: rawItem.year,
                    actors: rawItem.actor
                };

                standardItems.push(newItem);
            });

            return standardItems;
        },
        'olehdtv_search_transformer': function (rawData, config) {
            // 安全检查：如果输入不是数组，直接返回空数组
            if (!Array.isArray(rawData)) {
                console.error("Olehdtv搜索转换器错误：输入数据不是一个数组。");
                return [];
            }

            var standardItems = [];

            // 遍历原始的 list 数组
            rawData.forEach(function (rawItem) {

                // 【【【 核心转换逻辑：在这里进行字段映射 】】】
                // 我们从原始数据中，挑选出我们需要的字段，并将其重命名为我们内部使用的标准字段名

                var newItem = {
                    // 我们内部用 'title'，它来自原始数据的 'name'
                    title: rawItem.name,

                    // 我们内部用 'thumb'，它来自原始数据的 'picThumb'
                    // 并且我们需要用 resolveUrl 将相对路径转换为绝对路径
                    thumb: 'https://images.weserv.nl/?url=https://static.olelive.com/' + rawItem.picThumb,

                    // 我们内部用 'link'，它需要我们根据 'id' 手动拼接
                    // 假设详情页URL格式是 'https://www.olehdtv.com/index.php/vod/detail/id/{id}.html'
                    // link: resolveUrl('/index.php/vod/detail/id/' + rawItem.id + '.html', config.link),

                    link: 'https://api.olelive.com/v1/pub/vod/detail/' + rawItem.id + '/true',

                    // 【扩展字段】我们也可以把其他有用的信息带上
                    update: rawItem.remarks,
                    vote_average: rawItem.score,
                    year: rawItem.year,
                    actors: rawItem.actor
                };

                standardItems.push(newItem);
            });

            return standardItems;
        },
        'aggregator_detail_transformer': function (rawData, config) {
            // 安全检查
            if (!Array.isArray(rawData)) {
                console.error("聚合API转换器错误：输入数据不是一个数组。");
                return {};
            }

            var name = {
                'bfzym3u8': '暴风',
                '1080zyk': '优质',
                'kuaikan': '快看',
                'lzm3u8': '量子',
                'ffm3u8': '非凡',
                'haiwaikan': '海外看',
                'gsm3u8': '光速',
                'zuidam3u8': '最大',
                'bjm3u8': '八戒',
                'snm3u8': '索尼',
                'wolong': '卧龙',
                'xlm3u8': '新浪',
                'yhm3u8': '樱花',
                'tkm3u8': '天空',
                'jsm3u8': '极速',
                'wjm3u8': '无尽',
                'sdm3u8': '闪电',
                'kcm3u8': '快车',
                'jinyingm3u8': '金鹰',
                'fsm3u8': '飞速',
                'tpm3u8': '淘片',
                'lem3u8': '鱼乐',
                'dbm3u8': '百度',
                'tomm3u8': '番茄',
                'ukm3u8': 'U酷',
                'ikm3u8': '爱坤',
                'hnzym3u8': '红牛资源',
                'hnm3u8': '红牛',
                '68zy_m3u8': '68',
                'kdm3u8': '酷点',
                'bdxm3u8': '北斗星',
                'qhm3u8': '奇虎',
                'hhm3u8': '豪华'
            };

            var tabTitles = ['bfzym3u8', '1080zyk', 'kuaikan', 'lzm3u8', 'ffm3u8', 'qhm3u8'];
            var playlists = {};

            // 遍历每个线路对象
            rawData.forEach(function (lineObject, i) {
                if (!lineObject.resData) return;

                try {
                    // 使用 eval 解析 resData（与原代码保持一致）
                    var res_ = eval(lineObject.resData);

                    if (Array.isArray(res_) && res_.length > 0) {
                        var resData = res_[0];
                        var flag = resData.flag;
                        var lineUrlData = resData.url;
                        var newName = resData.newName;

                        // 确定线路名称
                        var tabName = name[flag] ? name[flag] + (tabTitles.includes(flag) ? '[荐]' : '') : '路线' + (i + 1);

                        if (lineUrlData && lineUrlData !== '') {
                            var standardItems = [];
                            var urls = lineUrlData.split("#");

                            if (urls && urls.length > 0) {
                                urls.forEach(function (url) {
                                    if (!url) return;

                                    var urlDatas = url.split("$");
                                    if (urlDatas && urlDatas.length > 1) {
                                        var urlName = urlDatas[0];
                                        var urlLink = urlDatas[1];
                                        var m3u8RegExpress = /m3u8$/i;

                                        if (urlName && urlName !== '' && urlLink && urlLink !== '' && m3u8RegExpress.test(urlLink)) {
                                            // 如果有 newName 并且符合条件，使用 newName 作为标题
                                            if (newName && newName !== "" && isNaN(newName) && config && config.mtype && config.mtype == 1) {
                                                urlName = newName;
                                            }

                                            standardItems.push({
                                                title: urlName,
                                                url: urlLink
                                            });
                                        }
                                    }
                                });
                            }

                            // 如果这个线路下有内容，就添加到最终结果中
                            if (standardItems.length > 0) {
                                playlists[tabName] = standardItems;
                            }
                        }
                    }
                } catch (e) {
                    console.error("解析 resData 失败:", e, lineObject.resData);
                }
            });

            return playlists;
        },
        'ddys_playlist_transformer_': function (rawList, config) {
            var playlists = {};
            if (!Array.isArray(rawList)) return playlists;

            rawList.forEach(function (item) {
                if (!item || !item.line || !item.url) return;
                if (!playlists[item.line]) playlists[item.line] = [];
                playlists[item.line].push({
                    title: item.title || '未知',
                    url: item.url
                });
            });

            return playlists;
        },
        'kafeizhibo_detail_transformer': function (rawData, config) {

            // 安全检查
            if (!rawData || !rawData.data || !Array.isArray(rawData.data.signals || rawData.data.replays)) {
                console.error("kafeizhibo.cc 详情转换器错误：输入数据结构不正确。");
                return {};
            }

            var standardItems = [];
            var rawItems = rawData.data.signals || rawData.data.replays;

            // 遍历原始的 urls 数组
            rawItems.forEach(function (rawItem) {
                // 【【【 核心转换逻辑 】】】
                // API返回的数据已经是最终的媒体流了
                if (rawItem.status == 'online' && !rawItem.hasOwnProperty("video_url")) {
                    standardItems.push({
                        title: rawItem.name,
                        url: rawItem.stream_url // url 已经是绝对路径，无需 resolveUrl
                    });
                } else {
                    standardItems.push({
                        title: rawItem.title,
                        url: rawItem.video_url // url 已经是绝对路径，无需 resolveUrl
                    });
                }
            });

            // 这个API只有一个播放列表，我们给它一个默认的线路名
            if (standardItems.length > 0) {
                return {
                    "在线播放": standardItems
                };
            }

            return {};
        },
        'doubaohibo_detail_transformer': function (rawData, config) {

            // 安全检查
            if (!rawData || !rawData.data || !Array.isArray(rawData.data.signals)) {
                console.error("doubaozhibo.cc 详情转换器错误：输入数据结构不正确。");
                return {};
            }

            var standardItems = [];
            var rawItems = rawData.data.signals;

            // 遍历原始的 urls 数组
            rawItems.forEach(function (rawItem) {
                // 【【【 核心转换逻辑 】】】
                // API返回的数据已经是最终的媒体流了
                if (rawData.success && rawItems && rawItems.length > 0) {
                    standardItems.push({
                        title: rawItem.name,
                        url: rawItem.proxyUrl // url 已经是绝对路径，无需 resolveUrl
                    });
                }
            });

            // 这个API只有一个播放列表，我们给它一个默认的线路名
            if (standardItems.length > 0) {
                return {
                    "在线播放": standardItems
                };
            }

            return {};
        },
        'kafeizhibo_list_transformer': function (rawData, config) {
            // 安全检查：如果输入不是数组，直接返回空数组
            if (!Array.isArray(rawData)) {
                console.error("kafeizhibo.cc转换器错误：输入数据不是一个数组。");
                return [];
            }

            var standardItems = [];
            var sports = {
                "upcoming": "未开始",
                "live": "进行中",
                "finished": "已结束",

            };

            // 遍历原始的 list 数组
            rawData.forEach(function (rawItem) {

                // 【【【 核心转换逻辑：在这里进行字段映射 】】】
                // 我们从原始数据中，挑选出我们需要的字段，并将其重命名为我们内部使用的标准字段名


                // console.log(rawItem)

                var roomId = null;

                if (rawItem.hasOwnProperty("archors")) {
                    for (var i = 0; i < rawItem.archors.length; i++) {
                        if (rawItem.archors[i].status === "online") {
                            roomId = rawItem.archors[i].room_id;
                            break;
                        }
                    }
                }

                // console.log(roomId); 
                var newItem = {
                    // 我们内部用 'title'，它来自原始数据的 'name'
                    title: rawItem.home_team + ' VS ' + rawItem.away_team,

                    // 我们内部用 'thumb'，它来自原始数据的 'picThumb'
                    // 并且我们需要用 resolveUrl 将相对路径转换为绝对路径
                    thumb: rawItem.home_team_logo,

                    // 我们内部用 'link'，它需要我们根据 'id' 手动拼接
                    // 假设详情页URL格式是 'https://www.olehdtv.com/index.php/vod/detail/id/{id}.html'
                    // link: resolveUrl('/index.php/vod/detail/id/' + rawItem.id + '.html', config.link),

                    link: rawItem.hasOwnProperty("archors") ? "https://kafeizhibo.cc/api/v1/room/" + roomId : "https://kafeizhibo.cc/api/v1/match/" + rawItem.match_id + "/recordings",

                    // 【扩展字段】我们也可以把其他有用的信息带上
                    update: rawItem.start_time.substring(5),
                    vote_average: rawItem.league_name,
                    episodes_info: sports[rawItem.status] + ' ' + rawItem.home_score + ':' + rawItem.away_score,
                    // actors: rawItem.time
                    website: rawItem.status == "live" ? sports[rawItem.status] : ""
                };

                if (rawItem.hasOwnProperty("archors") && rawItem.status != "finished") {
                    standardItems.push(newItem);
                } else {
                    if (!rawItem.hasOwnProperty("archors")) {
                        standardItems.push(newItem);
                    }

                }


            });

            return standardItems;
        },
        'doubaozhibo_list_transformer': function (rawData, config) {
            // 安全检查：如果输入不是数组，直接返回空数组
            if (!Array.isArray(rawData)) {
                console.error("www.doubaozhibo.com/转换器错误：输入数据不是一个数组。");
                return [];
            }

            var standardItems = [];

            // 遍历原始的 list 数组

            rawData.forEach(function (rawItem) {

                rawItem.live.forEach(function (item) {

                    var newItem = {
                        title: item.teamA + ' VS ' + item.teamB,

                        thumb: item.teamAImage,

                        link: item.signals && item.signals.length > 0
                            ? "https://www.doubaozhibo.com/api/v1/schedules/play/" + item.signals[0].playId + "?site=doubao"
                            : "",

                        update: (function (date) {
                            var d = new Date(date);
                            var month = d.getMonth() + 1;
                            var day = d.getDate();
                            var hour = d.getHours();
                            var minute = d.getMinutes();

                            return (month < 10 ? '0' : '') + month + '-' +
                                (day < 10 ? '0' : '') + day + ' ' +
                                (hour < 10 ? '0' : '') + hour + ':' +
                                (minute < 10 ? '0' : '') + minute;
                        })(item.matchTime),

                        vote_average: item.league,

                        episodes_info: item.teamAscore + ':' + item.teamBscore,

                        website: item.status == 1 ? '直播中' : ''
                    };

                    standardItems.push(newItem);

                });

            });

            return standardItems;
        },
        'douban_list_transformer': function (rawData, config) {

            var standardItems = []; // 用于存放最终转换好的标准卡片数组
            var itemsToProcess = []; // 用于存放需要被处理的原始项目数组

            // ★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★
            // ★              这是最关键的智能判断             ★
            // ★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★

            // 1. 判断数据结构
            if (typeof rawData === 'object' && rawData !== null && rawData.subjects) {
                // a. 这是“列表页”API的结构: { subjects: [...] }
                // console.log("豆瓣转换器: 检测到'列表页'数据结构 (subjects)");
                itemsToProcess = rawData.subjects;

                // 2a. 对“列表页”数据进行转换
                itemsToProcess.forEach(function (rawItem) {
                    standardItems.push({
                        title: rawItem.title,
                        thumb: rawItem.cover,
                        link: rawItem.url,
                        vote_average: rawItem.rate,
                        id: rawItem.id
                    });
                });

            } else if (Array.isArray(rawData)) {
                // b. 这是“搜索页”API的结构: [ {...}, {...} ]
                // console.log("豆瓣转换器: 检测到'搜索页'数据结构 (纯数组)");
                itemsToProcess = rawData;

                // 2b. 对“搜索页”数据进行转换
                itemsToProcess.forEach(function (rawItem) {
                    // 安全检查
                    if (typeof rawItem !== 'object' || rawItem === null) return;

                    standardItems.push({
                        title: rawItem.title,
                        thumb: rawItem.img,     // 搜索用 'img'
                        link: rawItem.url,
                        // vote_average: 'N/A',            // 搜索没有评分
                        vote_average: rawItem.rate | '',
                        id: rawItem.id,
                        year: rawItem.year,
                        update: rawItem.episode || rawItem.year,
                        // title_org: rawItem.sub_title
                    });
                });
            }
            // 3. 如果两种结构都不是，就返回空数组
            else {
                console.error("豆瓣转换器错误：接收到的 rawData 结构未知。");
                return [];
            }

            return standardItems;
        },
    },
    PLAYLIST_PARSERS: {
        '88kanqiu_live_playlist_parser': function (detailPageUrl, options, onSuccess, onError) {
            try {
                options = options || {};
                onSuccess = onSuccess || function () { };
                onError = onError || function () { };
                detailPageUrl = String(detailPageUrl || '');
                var runtimeNetwork = options.network || (typeof network !== 'undefined' ? network : null);
                var config = options.config || {};
                var helpers = options.helpers || {};

                function ensureUrl(url, baseUrl) {
                    if (!url) return '';
                    if (/^https?:\/\//i.test(url)) return url;
                    if (/^\/\//.test(url)) {
                        try { return new URL(baseUrl || detailPageUrl).protocol + url; } catch (e) { return 'https:' + url; }
                    }
                    try { return new URL(url, baseUrl || detailPageUrl).href; } catch (e) { return url; }
                }

                function originOf(url) {
                    try { return new URL(url).origin; } catch (e) { return 'https://www.88kanqiu.bar'; }
                }

                function buildHeaders(refererUrl) {
                    var headers = {};
                    if (config.headers) {
                        for (var key in config.headers) {
                            if (Object.prototype.hasOwnProperty.call(config.headers, key)) headers[key] = config.headers[key];
                        }
                    }
                    if (!headers['User-Agent'] && !headers['user-agent']) {
                        headers['User-Agent'] = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/138.0.0.0 Safari/537.36';
                    }
                    headers['Referer'] = refererUrl || detailPageUrl;
                    headers['Origin'] = originOf(headers['Referer']);
                    headers['X-Requested-With'] = 'XMLHttpRequest';
                    return headers;
                }

                function decodeBase64Utf8(value) {
                    var text = String(value || '').trim();
                    var binary = '';
                    if (helpers && typeof helpers.base64Decode === 'function') {
                        try { binary = helpers.base64Decode(text); } catch (e) { binary = ''; }
                    }
                    if (binary) {
                        try {
                            var escaped = '';
                            for (var bi = 0; bi < binary.length; bi += 1) {
                                escaped += '%' + ('00' + binary.charCodeAt(bi).toString(16)).slice(-2);
                            }
                            return decodeURIComponent(escaped);
                        } catch (e) {
                            return binary;
                        }
                    }
                    try {
                        if (typeof atob === 'function') {
                            binary = atob(text);
                            var percent = '';
                            for (var i = 0; i < binary.length; i += 1) {
                                percent += '%' + ('00' + binary.charCodeAt(i).toString(16)).slice(-2);
                            }
                            try { return decodeURIComponent(percent); } catch (e) { return binary; }
                        }
                    } catch (e) { }
                    try {
                        if (typeof Buffer !== 'undefined') return Buffer.from(text, 'base64').toString('utf8');
                    } catch (e) { }
                    return '';
                }

                function cleanUrl(value) {
                    var url = String(value || '')
                        .replace(/\\u0026/g, '&')
                        .replace(/\\\//g, '/')
                        .replace(/&amp;/g, '&')
                        .trim();
                    try { url = decodeURIComponent(url); } catch (e) { }
                    return url;
                }

                function isFinalMediaUrl(url) {
                    if (!/^https?:\/\//i.test(url || '')) return false;
                    try {
                        return /(?:\.m3u8|\.mp4|\.m4s|\.webm|\.mpd)$/i.test(new URL(url).pathname || '');
                    } catch (e) {
                        return /(?:\.m3u8|\.mp4|\.m4s|\.webm|\.mpd)(?:[?#]|$)/i.test(url);
                    }
                }

                function mediaPriority(url) {
                    if (/\/\/(?:hls\.live123\.fans|stream\.sports3\.win)\//i.test(url || '')) return 0;
                    if (/\/\/(?:www\.)?rtmpcdn\.com\//i.test(url || '')) return 2;
                    return 1;
                }

                function queryParam(url, name) {
                    try { return new URL(url, detailPageUrl).searchParams.get(name) || ''; } catch (e) { }
                    var match = new RegExp('[?&]' + name + '=([^&#]+)', 'i').exec(String(url || ''));
                    return match && match[1] ? match[1] : '';
                }

                function unwrapMediaUrl(url, baseUrl) {
                    var direct = cleanUrl(url);
                    if (isFinalMediaUrl(direct)) return ensureUrl(direct, baseUrl);
                    var wrapped = queryParam(direct, 'url');
                    if (wrapped) {
                        wrapped = cleanUrl(wrapped);
                        if (isFinalMediaUrl(wrapped)) return ensureUrl(wrapped, baseUrl);
                    }
                    return '';
                }

                function decodeSourceResponse(responseText) {
                    var response = typeof responseText === 'string' ? JSON.parse(responseText) : responseText;
                    var wrappedData = response && response.data ? String(response.data) : '';
                    if (!wrappedData) return null;
                    var decoded = decodeBase64Utf8(wrappedData.length > 8 ? wrappedData.slice(6, -2) : wrappedData);
                    return decoded ? JSON.parse(decoded) : null;
                }

                function uniqueLineName(baseName, seen) {
                    var name = String(baseName || '').replace(/\s+/g, ' ').trim() || '线路';
                    seen[name] = (seen[name] || 0) + 1;
                    return seen[name] > 1 ? (name + ' ' + seen[name]) : name;
                }

                function sourceApiUrl(pageUrl) {
                    var idMatch = /\/live\/(\d+)(?:\/play)?/i.exec(String(pageUrl || ''));
                    if (!idMatch || !idMatch[1]) return '';
                    var api = originOf(pageUrl || config.link || 'https://www.88kanqiu.bar') + '/live/' + idMatch[1] + '/source';
                    var shareId = queryParam(pageUrl, 'share_id');
                    return shareId ? (api + '?share_id=' + encodeURIComponent(shareId)) : api;
                }

                var apiUrl = sourceApiUrl(detailPageUrl);
                if (!apiUrl) {
                    onError('88kanqiu: 无法从直播详情页 URL 提取 gameId');
                    return;
                }
                if (!runtimeNetwork || !runtimeNetwork['native']) {
                    onError('88kanqiu: 缺少 network.native');
                    return;
                }

                runtimeNetwork['native'](
                    apiUrl,
                    function (responseText) {
                        try {
                            var payload = decodeSourceResponse(responseText);
                            var links = payload && Array.isArray(payload.links) ? payload.links : [];
                            if (!links.length) {
                                onError('88kanqiu: 未获取到直播线路，可能比赛未开始或线路已下线');
                                return;
                            }

                            var sortable = [];
                            links.forEach(function (link, index) {
                                var rawUrl = ensureUrl(link && link.url ? link.url : '', detailPageUrl);
                                if (!rawUrl) return;
                                var directUrl = unwrapMediaUrl(rawUrl, detailPageUrl);
                                sortable.push({
                                    order: directUrl ? mediaPriority(directUrl) : 9,
                                    index: index,
                                    name: link.name || ('线路 ' + (index + 1)),
                                    url: directUrl || rawUrl
                                });
                            });
                            sortable.sort(function (a, b) {
                                if (a.order !== b.order) return a.order - b.order;
                                return a.index - b.index;
                            });

                            var seen = {};
                            var items = sortable.map(function (item) {
                                var lineName = uniqueLineName(item.name, seen);
                                return {
                                    line: '直播线路',
                                    title: lineName,
                                    url: item.url
                                };
                            });
                            if (!items.length) {
                                onError('88kanqiu: 直播线路为空');
                                return;
                            }
                            onSuccess({ data: { list: items } });
                        } catch (e) {
                            onError('88kanqiu: 直播线路解析失败 - ' + (e && e.message ? e.message : e));
                        }
                    },
                    function (a, c) {
                        var decode = runtimeNetwork.errorDecode ? runtimeNetwork.errorDecode(a, c) : String(a || c || 'network error');
                        onError('88kanqiu: 请求直播线路失败 - ' + decode);
                    },
                    false,
                    { dataType: 'text' }
                );
            } catch (e) {
                (onError || function () { })('88kanqiu_live_playlist_parser: ' + (e && e.message ? e.message : e));
            }
        },
        'sorani_playlist_parser': function (detailPageUrl, options, onSuccess, onError) {
            var net = options && options.network ? options.network : (typeof network !== 'undefined' ? network : null);
            var helpers = options && options.helpers ? options.helpers : {};
            var config = options && options.config ? options.config : {};
            if (!net || !net.native) {
                onError('Sorani: network.native 不可用');
                return;
            }

            function apiBase() {
                return 'https://api.sorani.cc/sorani-cms';
            }

            function buildHeaders(referer) {
                return {
                    'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/139.0 Safari/537.36',
                    'Accept': 'application/json, text/plain, */*',
                    'Origin': 'https://www.sorani.net',
                    'Referer': referer || 'https://www.sorani.net/anime/explore'
                };
            }

            function buildRequestConfig(referer) {
                var requestConfig = {};
                var key;

                for (key in config) {
                    if (Object.prototype.hasOwnProperty.call(config, key)) requestConfig[key] = config[key];
                }

                requestConfig.headers = buildHeaders(referer);
                return requestConfig;
            }

            function requestJson(url, referer, done, fail) {
                var requestConfig = buildRequestConfig(referer);
                var request;

                if (helpers.buildRuleRequest && helpers.requestRuleNative) {
                    request = helpers.buildRuleRequest(url, 'json', requestConfig);
                    helpers.requestRuleNative(net, request, done, fail, false);
                    return;
                }

                net.native(url, done, fail, false, { dataType: 'json', headers: requestConfig.headers });
            }

            function parseJson(payload) {
                if (payload && typeof payload === 'object') return payload;
                try { return JSON.parse(String(payload || '')); } catch (e) { return null; }
            }

            function getVideoId(url) {
                var text = String(url || '');
                var match = /\/anime\/mal\/(\d+)/i.exec(text) || /\/api\/video\/(\d+)/i.exec(text) || /[?&]videoId=(\d+)/i.exec(text);
                return match && match[1] ? match[1] : '';
            }

            var videoId = getVideoId(detailPageUrl);
            if (!videoId) {
                onError('Sorani: 无法从详情页 URL 提取 videoId');
                return;
            }

            var detailApi = apiBase() + '/api/video/' + videoId;
            requestJson(detailApi, detailPageUrl, function (resp) {
                var payload = parseJson(resp);
                var data = payload && payload.data ? payload.data : null;
                var episodes = data && Array.isArray(data.episodes) ? data.episodes.slice() : [];
                if (!episodes.length) {
                    onError('Sorani: 详情接口未返回集数');
                    return;
                }

                episodes.sort(function (a, b) {
                    var ao = Number(a && a.episodeOrder);
                    var bo = Number(b && b.episodeOrder);
                    if (isFinite(ao) && isFinite(bo)) return ao - bo;
                    return Number(a && a.episodeId || 0) - Number(b && b.episodeId || 0);
                });

                var items = episodes.filter(function (episode) {
                    return episode && episode.episodeId && episode.enable !== false && episode.enabled !== false;
                }).map(function (episode) {
                    var title = episode.title || episode.episodeLabel || ('第' + (episode.episodeOrder || episode.episodeId) + '集');
                    return {
                        line: '青空次元',
                        title: title,
                        url: apiBase() + '/api/video/episode/' + episode.episodeId + '/play'
                    };
                });

                if (!items.length) {
                    onError('Sorani: 没有可播放集数');
                    return;
                }
                onSuccess({ data: { list: items } });
            }, function (a, c) {
                onError('Sorani: 请求详情接口失败 - ' + (net.errorDecode ? net.errorDecode(a, c) : 'network error'));
            });
        },
        vidsrc_unified_playlist_parser: function (detailPageUrl, options, onSuccess, onError) {
            var tmdbKey = "4152ea09a44140809f82d68a9b2b0024";
            var ruleConfig = (options && options.config) || {};

            function readFlag(value) {
                var text;
                if (typeof value === "boolean") return value;
                if (typeof value === "number") return value !== 0;
                if (typeof value !== "string") return undefined;
                text = value.trim().toLowerCase();
                if (!text) return undefined;
                if (/^(0|false|no|off|null|undefined)$/i.test(text)) return false;
                if (/^(1|true|yes|on)$/i.test(text)) return true;
                return undefined;
            }

            function getPlaybackProxySegmentsOverride(providerName) {
                var value = readRuntimeSetting("playback_proxy_segments", providerName, "proxy_segments");
                return readFlag(value);
            }

            function getPlaybackSegmentProxyBase(providerName) {
                var value = readRuntimeString("playback_segment_proxy_base", providerName, "segment_proxy_base", "") ||
                    readRuntimeString("segment_proxy_base", providerName, "segment_proxy_base", "");
                return value ? normalizeProxyBase(value) : "";
            }

            function addPlaybackProxyRoutingParams(params, providerName) {
                var override = getPlaybackProxySegmentsOverride(providerName);
                var proxyBase = getPlaybackSegmentProxyBase(providerName);

                if (providerName === "vidfast_real_api") {
                    params.playback_proxy_segments = "1";
                    return params;
                }
                if (override !== undefined) params.playback_proxy_segments = override ? "1" : "0";
                if (proxyBase) params.playback_segment_proxy_base = proxyBase;
                return params;
            }

            function readProviderSetting(source, providerName) {
                var providerConfigs;
                var scopedKey = providerName + "_available";
                var value;

                if (!source || typeof source !== "object") return undefined;

                value = readFlag(source[providerName]);
                if (value !== undefined) return value;
                value = readFlag(source[scopedKey]);
                if (value !== undefined) return value;

                providerConfigs = source.provider_configs || source.playback_provider_configs || source.providers || source.playback_providers || {};
                value = readFlag(providerConfigs && providerConfigs[providerName]);
                if (value !== undefined) return value;
                value = readFlag(providerConfigs && providerConfigs[providerName] && providerConfigs[providerName].available);
                if (value !== undefined) return value;

                return undefined;
            }

            function isProviderEnabled(providerName, defaultValue, urlOverride) {
                var sources = [
                    ruleConfig,
                    ruleConfig.config,
                    ruleConfig.full_button,
                    ruleConfig.full_button && ruleConfig.full_button.config,
                    ruleConfig.__web5_full_button,
                    ruleConfig.__web5_full_button && ruleConfig.__web5_full_button.config,
                    options,
                    options && options.config,
                    options && options.full_button,
                    options && options.full_button && options.full_button.config,
                    options && options.__web5_full_button,
                    options && options.__web5_full_button && options.__web5_full_button.config
                ];
                var providerDefaults = {
                    videasy_real: true,
                    videasy_real_api: false,
                    vidlink_real_api: false,
                    vidfast_real_api: false,
                    vidfast_real: false,
                    vidsrc_in_real: false,
                    vsembed_real_api: false,
                    cinesrc_real_api: false
                };
                var value;
                var i;
                var configuredSources = getConfiguredProviderSources();

                if (configuredSources !== null) {
                    var configuredSource = getConfiguredProviderSource(providerName);
                    return !!(configuredSource && configuredSource.enable);
                }

                for (i = 0; i < sources.length; i++) {
                    value = readProviderSetting(sources[i], providerName);
                    if (value !== undefined) return value;
                }
                if (typeof urlOverride === "boolean") return urlOverride;
                if (typeof providerDefaults[providerName] === "boolean") return providerDefaults[providerName];
                return defaultValue;
            }

            function parseQuery(url) {
                var text = String(url || "");
                var query = {};
                var queryPart = text.split("?")[1] || "";

                queryPart.split("&").forEach(function (pair) {
                    if (!pair) return;
                    var bits = pair.split("=");
                    var key = safeDecodeURIComponent(bits[0] || "");
                    if (!key) return;
                    query[key] = safeDecodeURIComponent(bits.slice(1).join("=") || "");
                });

                return query;
            }

            function safeDecodeURIComponent(value) {
                try {
                    return decodeURIComponent(String(value || "").replace(/\+/g, "%20"));
                } catch (e) {
                    return String(value || "");
                }
            }

            function isTruthyFlag(value) {
                var text = String(value === undefined || value === null ? "" : value).trim().toLowerCase();
                if (!text) return false;
                return !(/^(0|false|no|off|null|undefined)$/i.test(text));
            }

            function extractDetailInfo(url) {
                var text = String(url || "");
                var query = parseQuery(text);
                var tvMatch = text.match(/vidsrc:\/\/detail\/tv\/(\d+)/i) || text.match(/\/tv\/(\d+)/i) || text.match(/[?&]tv_id=(\d+)/i);
                var movieMatch = text.match(/vidsrc:\/\/detail\/movie\/(\d+)/i) || text.match(/\/movie\/(\d+)/i) || text.match(/[?&]movie_id=(\d+)/i);
                var type = query.media_type || query.type || "";

                if (!type) type = tvMatch ? "tv" : "movie";

                return {
                    type: type === "tv" ? "tv" : "movie",
                    id: (type === "tv" ? (tvMatch && tvMatch[1]) : (movieMatch && movieMatch[1])) || query.tmdb_id || query.id || "",
                    title: query.title || "",
                    year: query.year || "",
                    imdbId: query.imdb_id || query.imdbId || "",
                    // episode: episode.episode,
                    // season: episode.season,
                    // tmdbid: state.movie && state.movie.id,
                    totalSeasons: query.total_seasons || query.totalSeasons || "",
                    episodeFilter: query.episode_filter || query.episodeFilter || "",
                    vidfastReal: isTruthyFlag(query.vidfast_real || query.vidfastReal) || isProviderEnabled("vidfast_real", false),
                    vidfastRealApi: isTruthyFlag(query.vidfast_real_api || query.vidfastRealApi || query.vidfast_api || query.vidfastApi) || isProviderEnabled("vidfast_real_api", false),
                    vidsrcInReal: isTruthyFlag(query.vidsrc_in_real || query.vidsrcInReal || query.vidsrc_in || query.vidsrcIn) || isProviderEnabled("vidsrc_in_real", false),
                    vsembedRealApi: isTruthyFlag(query.vsembed_real_api || query.vsembedRealApi || query.vsembed_api || query.vsembedApi) || isProviderEnabled("vsembed_real_api", false),
                    vidlinkRealApi: isTruthyFlag(query.vidlink_real_api || query.vidlinkRealApi || query.vidlink_api || query.vidlinkApi) || isProviderEnabled("vidlink_real_api", false),
                    cinesrcRealApi: isTruthyFlag(query.cinesrc_real_api || query.cinesrcRealApi || query.cinesrc_api || query.cinesrcApi) || isProviderEnabled("cinesrc_real_api", false)
                };
            }

            function toNumberId(value) {
                var number = Number(value);
                return number ? number : value;
            }

            function buildTmdbCard(data, info, type) {
                data = data || {};
                info = info || {};

                var isTv = type === "tv";
                var id = toNumberId(data.id || info.id);
                var imdbId = info.imdbId || data.imdb_id || (data.external_ids && data.external_ids.imdb_id) || "";
                var title = info.title || data.title || data.name || data.original_title || data.original_name || "";
                var originalTitle = data.original_title || data.original_name || title;
                var date = isTv ? data.first_air_date : data.release_date;

                return {
                    id: id,
                    source: "tmdb",
                    media_type: isTv ? "tv" : "movie",
                    title: isTv ? title : (data.title || title),
                    name: isTv ? title : undefined,
                    original_title: isTv ? undefined : originalTitle,
                    original_name: isTv ? originalTitle : undefined,
                    imdb_id: imdbId,
                    release_date: isTv ? undefined : (data.release_date || ""),
                    first_air_date: isTv ? (data.first_air_date || "") : undefined,
                    year: info.year || (date ? String(date).slice(0, 4) : ""),
                    number_of_seasons: isTv ? (data.number_of_seasons || info.totalSeasons || "") : undefined,
                    poster_path: data.poster_path || "",
                    backdrop_path: data.backdrop_path || ""
                };
            }

            function getPlaybackProviderConfigs(info) {
                return {
                    videasy_real: { available: isProviderEnabled("videasy_real", true) },
                    videasy_real_api: { available: isProviderEnabled("videasy_real_api", false, info && info.videasyRealApi) },
                    vidlink_real_api: { available: isProviderEnabled("vidlink_real_api", false, info && info.vidlinkRealApi) },
                    vidfast_real_api: { available: isProviderEnabled("vidfast_real_api", false, info && info.vidfastRealApi) },
                    vidfast_real: { available: isProviderEnabled("vidfast_real", false, info && info.vidfastReal) },
                    vidsrc_in_real: { available: isProviderEnabled("vidsrc_in_real", false, info && info.vidsrcInReal) },
                    vsembed_real_api: { available: isProviderEnabled("vsembed_real_api", false, info && info.vsembedRealApi) },
                    cinesrc_real_api: { available: isProviderEnabled("cinesrc_real_api", false, info && info.cinesrcRealApi) }
                };
            }

            function getPreferredVideasyProvider(info) {
                return isPlaybackProviderAvailable("videasy_real_api", info) ? "videasy_real_api" : "videasy_real";
            }

            function getPreferredVidfastProvider(info) {
                return isPlaybackProviderAvailable("vidfast_real_api", info) ? "vidfast_real_api" : "vidfast_real";
            }

            function normalizePlaybackProviderKey(provider) {
                var key = String(provider || "").toLowerCase();
                var aliases = {
                    auto: "auto",
                    videasy: "videasy_real",
                    videasy_real: "videasy_real",
                    videasy_api: "videasy_real_api",
                    videasy_real_api: "videasy_real_api",
                    vidfast_api: "vidfast_real_api",
                    vidfast_real_api: "vidfast_real_api",
                    vidfast: "vidfast_real",
                    vidfast_real: "vidfast_real",
                    vidlink: "vidlink_real_api",
                    vidlink_api: "vidlink_real_api",
                    vidlink_real_api: "vidlink_real_api",
                    vidsrcin: "vidsrc_in_real",
                    vidsrc_in: "vidsrc_in_real",
                    vidsrc_in_real: "vidsrc_in_real",
                    vsembed: "vsembed_real_api",
                    vsembed_api: "vsembed_real_api",
                    vsembed_real_api: "vsembed_real_api",
                    cinesrc: "cinesrc_real_api",
                    cinesrc_api: "cinesrc_real_api",
                    cinesrc_real_api: "cinesrc_real_api"
                };
                return aliases[key] || key;
            }

            function getRuntimeConfigSources() {
                return [
                    ruleConfig,
                    ruleConfig.config,
                    ruleConfig.full_button,
                    ruleConfig.full_button && ruleConfig.full_button.config,
                    ruleConfig.__web5_full_button,
                    ruleConfig.__web5_full_button && ruleConfig.__web5_full_button.config,
                    options,
                    options && options.config,
                    options && options.full_button,
                    options && options.full_button && options.full_button.config,
                    options && options.__web5_full_button,
                    options && options.__web5_full_button && options.__web5_full_button.config
                ];
            }

            function normalizeConfiguredSource(source) {
                var id;
                var enable;
                var tvSeriesEnable;
                var supportedProviders = {
                    videasy_real: true,
                    videasy_real_api: true,
                    vidlink_real_api: true,
                    vidfast_real_api: true,
                    vidfast_real: true,
                    vidsrc_in_real: true,
                    vsembed_real_api: true,
                    cinesrc_real_api: true
                };

                if (!source || typeof source !== "object") return null;

                id = normalizePlaybackProviderKey(source.id || source.provider || source.source);
                if (!id || id === "auto" || !supportedProviders[id]) return null;

                enable = readFlag(source.enable);
                if (enable === undefined) enable = true;

                tvSeriesEnable = readFlag(source.tv_series_enable);
                if (tvSeriesEnable === undefined) tvSeriesEnable = readFlag(source.tvSeriesEnable);
                if (tvSeriesEnable === undefined) tvSeriesEnable = false;

                return {
                    id: id,
                    enable: enable,
                    tvSeriesEnable: tvSeriesEnable,
                    raw: source
                };
            }

            function getConfiguredProviderSources() {
                var runtimeSources = getRuntimeConfigSources();
                var configured;
                var result;
                var seen;
                var i;

                for (i = 0; i < runtimeSources.length; i += 1) {
                    if (!runtimeSources[i] || typeof runtimeSources[i] !== "object") continue;
                    if (!Object.prototype.hasOwnProperty.call(runtimeSources[i], "sources")) continue;

                    configured = runtimeSources[i].sources;
                    if (!Array.isArray(configured)) return [];

                    result = [];
                    seen = {};
                    configured.forEach(function (source) {
                        var normalized = normalizeConfiguredSource(source);
                        if (!normalized || seen[normalized.id]) return;
                        seen[normalized.id] = true;
                        result.push(normalized);
                    });
                    return result;
                }

                return null;
            }

            function getConfiguredProviderSource(providerName) {
                var configured = getConfiguredProviderSources();
                var key = normalizePlaybackProviderKey(providerName);
                var i;

                if (configured === null) return null;

                for (i = 0; i < configured.length; i += 1) {
                    if (configured[i].id === key) return configured[i];
                }

                return null;
            }

            function getConfiguredProviderEntries(mediaType) {
                var configured = getConfiguredProviderSources();

                if (configured === null) return null;

                return configured.filter(function (source) {
                    if (!source.enable) return false;
                    if (mediaType === "tv" && !source.tvSeriesEnable) return false;
                    return true;
                });
            }

            function isPlaybackProviderAvailable(provider, info) {
                var key = normalizePlaybackProviderKey(provider);
                var config = getPlaybackProviderConfigs(info)[key];
                var configuredSource = getConfiguredProviderSource(key);

                if (configuredSource && info && info.type === "tv" && !configuredSource.tvSeriesEnable) return false;
                return !!(config && config.available);
            }

            function getConfiguredProviderTitle(provider) {
                var titles = {
                    videasy_real: "Videasy",
                    videasy_real_api: "Videasy API",
                    vidfast_real: "VidFast",
                    vidfast_real_api: "VidFast API",
                    vidsrc_in_real: "VidSrc.in",
                    vsembed_real_api: "VSEmbed",
                    vidlink_real_api: "VidLink",
                    cinesrc_real_api: "CineSrc"
                };

                return titles[provider] || provider;
            }

            function appendConfiguredPlaybackSourceItems(items, source) {
                var prefix = getConfiguredProviderTitle(source.id);

                if (source.id === "videasy_real" || source.id === "videasy_real_api") {
                    items.push({ title: prefix + " 自动", provider: source.id, source: "auto" });
                    items.push({ title: prefix + " 高清源", provider: source.id, source: "m4uhd" });
                    items.push({ title: prefix + " CDN源", provider: source.id, source: "cdn" });
                    items.push({ title: prefix + " 备用源", provider: source.id, source: "lamovie" });
                    return;
                }

                if (source.id === "vidfast_real" || source.id === "vidfast_real_api") {
                    items.push({ title: prefix + " 自动", provider: source.id, source: "auto" });
                    items.push({ title: prefix + " vRapid", provider: source.id, source: "vrapid" });
                    items.push({ title: prefix + " vEdge(4K)", provider: source.id, source: "vedge" });
                    items.push({ title: prefix + " Cobra", provider: source.id, source: "cobra" });
                    items.push({ title: prefix + " Cine", provider: source.id, source: "cine" });
                    items.push({ title: prefix + " vFast", provider: source.id, source: "vfast" });
                    items.push({ title: prefix + " Horizon", provider: source.id, source: "horizon" });
                    items.push({ title: prefix + " Bravo", provider: source.id, source: "bravo" });
                    return;
                }

                items.push({ title: prefix + " 自动", provider: source.id, source: "auto" });
            }

            function getPlaybackSourceItems(info) {
                var configuredSources = getConfiguredProviderEntries("movie");
                var videasyProvider = getPreferredVideasyProvider(info);
                var vidfastProvider = getPreferredVidfastProvider(info);
                var items = [
                    { title: "自动优先", provider: "auto", source: "auto" },
                    { title: "Videasy 自动", provider: videasyProvider, source: "auto" },
                    { title: "Videasy 高清源", provider: videasyProvider, source: "m4uhd" },
                    { title: "Videasy CDN源", provider: videasyProvider, source: "cdn" },
                    { title: "Videasy 备用源", provider: videasyProvider, source: "lamovie" },
                    { title: "VidFast 自动", provider: vidfastProvider, source: "auto" },
                    { title: "VidFast vRapid", provider: vidfastProvider, source: "vrapid" },
                    { title: "VidFast vEdge(4K)", provider: vidfastProvider, source: "vedge" },
                    { title: "VidFast Cobra", provider: vidfastProvider, source: "cobra" },
                    { title: "VidFast Cine", provider: vidfastProvider, source: "cine" },
                    { title: "VidFast vFast", provider: vidfastProvider, source: "vfast" },
                    { title: "VidFast Horizon", provider: vidfastProvider, source: "horizon" },
                    { title: "VidFast Bravo", provider: vidfastProvider, source: "bravo" },
                    { title: "VidSrc.in 自动", provider: "vidsrc_in_real", source: "auto" },
                    { title: "VSEmbed 自动", provider: "vsembed_real_api", source: "auto" },
                    { title: "VidLink 自动", provider: "vidlink_real_api", source: "auto" },
                    { title: "CineSrc 自动", provider: "cinesrc_real_api", source: "auto" }
                ];

                if (configuredSources !== null) {
                    items = [];
                    if (configuredSources.length) items.push({ title: "自动优先", provider: "auto", source: "auto" });
                    configuredSources.forEach(function (source) {
                        appendConfiguredPlaybackSourceItems(items, source);
                    });
                    return items;
                }

                return items.filter(function (item) {
                    if (!item || item.provider === "auto") return Object.keys(getPlaybackProviderConfigs(info)).some(function (provider) {
                        return isPlaybackProviderAvailable(provider, info);
                    });
                    return isPlaybackProviderAvailable(item.provider, info);
                });
            }

            function buildVidsrcPlayUrl(type, id, season, episode, params) {
                var path = type === "tv"
                    ? "vidsrc://tv/" + id + "/" + season + "/" + episode
                    : "vidsrc://movie/" + id;
                var query = [];
                params = params || {};
                Object.keys(params).forEach(function (key) {
                    if (params[key] === undefined || params[key] === null || params[key] === "") return;
                    query.push(encodeURIComponent(key) + "=" + encodeURIComponent(params[key]));
                });
                return path + (query.length ? "?" + query.join("&") : "");
            }

            function buildTvPlayUrl(id, season, episode, params) {
                var playParams = {};
                params = params || {};
                Object.keys(params).forEach(function (key) {
                    playParams[key] = params[key];
                });
                if (!playParams.provider) playParams.provider = "vidsrc_in_real";
                if (!playParams.source) playParams.source = "auto";
                return buildVidsrcPlayUrl("tv", id, season, episode, playParams);
            }

            function buildMovieLines(info, movieData) {
                var card = buildTmdbCard(movieData || {}, info, "movie");
                var movieId = card.id || info.id;
                var imdbId = card.imdb_id || info.imdbId || "";
                var title = info.title || card.title || card.original_title || "";
                var year = info.year || card.year || "";
                var sourceItems = getPlaybackSourceItems(info);

                function makeItem(sourceItem) {
                    return {
                        title: sourceItem.title,
                        url: buildVidsrcPlayUrl("movie", movieId || info.id, 0, 1, {
                            provider: sourceItem.provider,
                            source: sourceItem.source,
                            title: title,
                            year: year,
                            imdb_id: imdbId,
                            tmdb_id: movieId,
                            media_type: "movie",
                            vidfast_real: info.vidfastReal ? "1" : "",
                            vidfast_real_api: info.vidfastRealApi ? "1" : "",
                            vidsrc_in_real: info.vidsrcInReal ? "1" : "",
                            vsembed_real_api: info.vsembedRealApi ? "1" : "",
                            vidlink_real_api: info.vidlinkRealApi ? "1" : "",
                            cinesrc_real_api: info.cinesrcRealApi ? "1" : ""
                        }),
                        card: card,
                        tmdbid: movieId,
                        tmdb_id: movieId,
                        imdb_id: imdbId,
                        season: 0,
                        episode: 1,
                        subtitles: []
                    };
                }

                return [{
                    title: "播放线路",
                    items: sourceItems.map(makeItem)
                }];
            }

            function getTodayDateString() {
                var now = new Date();
                var month = String(now.getMonth() + 1);
                var day = String(now.getDate());
                if (month.length < 2) month = "0" + month;
                if (day.length < 2) day = "0" + day;
                return now.getFullYear() + "-" + month + "-" + day;
            }

            function normalizeDate(value) {
                return value ? String(value).slice(0, 10) : "";
            }

            function isFutureDate(value, today) {
                var date = normalizeDate(value);
                return !!date && date > today;
            }

            function isAiredEpisode(episode, today) {
                var date = normalizeDate(episode && episode.air_date);
                return !!date && date <= today;
            }

            function getTvEpisodeFilterMode(info, parserOptions) {
                var config = (parserOptions && parserOptions.config) || {};
                var mode = String(info.episodeFilter || parserOptions.tvEpisodeFilterMode || config.tv_episode_filter_mode || "latest").toLowerCase();
                return mode === "all" ? "all" : "latest";
            }

            function getCandidateSeasons(data, today) {
                if (!data || !Array.isArray(data.seasons)) return [];
                return data.seasons.filter(function (season) {
                    var seasonNumber = Number(season.season_number);
                    var episodeCount = Number(season.episode_count);
                    if (!seasonNumber || !episodeCount) return false;
                    return !isFutureDate(season.air_date, today);
                }).sort(function (a, b) {
                    return Number(b.season_number) - Number(a.season_number);
                });
            }

            function getEpisodeNumbers(season, episodeDetails, today) {
                var numbers = [];
                var episodeCount = Number(season.episode_count);
                var episode;

                if (Array.isArray(episodeDetails)) {
                    episodeDetails.forEach(function (item) {
                        var number = Number(item && item.episode_number);
                        if (number && isAiredEpisode(item, today)) numbers.push(number);
                    });
                    numbers.sort(function (a, b) {
                        return a - b;
                    });
                    return numbers;
                }

                for (episode = 1; episode <= episodeCount; episode++) numbers.push(episode);
                return numbers;
            }

            function buildTvLines(data, info, episodeMap) {
                var lines = [];
                var showId = data.id || info.id;
                var title = info.title || data.name || data.original_name || "";
                var year = info.year || (data.first_air_date ? String(data.first_air_date).slice(0, 4) : "");
                var imdbId = info.imdbId || data.imdb_id || (data.external_ids && data.external_ids.imdb_id) || "";
                var totalSeasons = info.totalSeasons || data.number_of_seasons || "";
                var today = getTodayDateString();
                var card = buildTmdbCard(data, info, "tv");
                var configuredTvSources = getConfiguredProviderEntries("tv");
                var tvProvider = configuredTvSources !== null
                    ? "auto"
                    : (isPlaybackProviderAvailable("vidsrc_in_real", info)
                        ? "vidsrc_in_real"
                        : (isPlaybackProviderAvailable("vsembed_real_api", info)
                            ? "vsembed_real_api"
                            : (isPlaybackProviderAvailable("videasy_real_api", info)
                                ? "videasy_real_api"
                                : (isPlaybackProviderAvailable("vidlink_real_api", info)
                                    ? "vidlink_real_api"
                                    : getPreferredVideasyProvider(info)))));

                getCandidateSeasons(data, today).forEach(function (season) {
                    var seasonNumber = Number(season.season_number);
                    var episodeNumbers = getEpisodeNumbers(season, episodeMap && episodeMap[seasonNumber], today);
                    var items = [];

                    if (!showId || !seasonNumber || !episodeNumbers.length) return;

                    episodeNumbers.forEach(function (episode) {
                        var playMeta = {
                            title: title,
                            year: year,
                            imdb_id: imdbId,
                            total_seasons: totalSeasons,
                            tmdb_id: showId,
                            media_type: "tv",
                            season: seasonNumber,
                            episode: episode,
                            provider: tvProvider,
                            source: "auto",
                            vidfast_real: info.vidfastReal ? "1" : "",
                            vidfast_real_api: info.vidfastRealApi ? "1" : "",
                            vidsrc_in_real: info.vidsrcInReal ? "1" : "",
                            vsembed_real_api: info.vsembedRealApi ? "1" : "",
                            vidlink_real_api: info.vidlinkRealApi ? "1" : "",
                            cinesrc_real_api: info.cinesrcRealApi ? "1" : ""
                        };

                        items.push({
                            title: "第 " + episode + " 集",
                            url: buildTvPlayUrl(showId, seasonNumber, episode, playMeta),
                            card: card,
                            tmdbid: toNumberId(showId),
                            tmdb_id: toNumberId(showId),
                            imdb_id: imdbId,
                            season: seasonNumber,
                            episode: episode,
                            subtitles: []
                        });
                    });

                    lines.push({
                        title: "第 " + seasonNumber + " 季",
                        items: items
                    });
                });

                return lines;
            }

            function resolveTvEpisodeMap(data, info, parserOptions, done) {
                var today = getTodayDateString();
                var seasons = getCandidateSeasons(data, today);
                var mode = getTvEpisodeFilterMode(info, parserOptions || {});

                if (!seasons.length) return done({});
                if (mode !== "all") seasons = [seasons[0]];

                fetchSeasonDetails(data.id || info.id, seasons, parserOptions, done);
            }

            function fetchSeasonDetails(showId, seasons, parserOptions, done) {
                var episodeMap = {};

                function next(index) {
                    if (index >= seasons.length) return done(episodeMap);

                    var seasonNumber = Number(seasons[index].season_number);
                    fetchSeasonDetail(showId, seasonNumber, parserOptions, function (seasonData) {
                        if (seasonData && Array.isArray(seasonData.episodes)) episodeMap[seasonNumber] = seasonData.episodes;
                        next(index + 1);
                    }, function () {
                        next(index + 1);
                    });
                }

                next(0);
            }

            function fetchMovieDetail(info, parserOptions, done, fail) {
                var url = "https://api.themoviedb.org/3/movie/" + encodeURIComponent(info.id) +
                    "?api_key=" + tmdbKey +
                    "&language=zh&append_to_response=external_ids";
                requestJson(url, {}, parserOptions, done, fail);
            }

            function fetchTvDetail(info, parserOptions, done, fail) {
                var url = "https://api.themoviedb.org/3/tv/" + encodeURIComponent(info.id) +
                    "?api_key=" + tmdbKey +
                    "&language=zh&append_to_response=external_ids";
                requestJson(url, {}, parserOptions, done, fail);
            }

            function fetchSeasonDetail(showId, seasonNumber, parserOptions, done, fail) {
                var url = "https://api.themoviedb.org/3/tv/" + encodeURIComponent(showId) +
                    "/season/" + encodeURIComponent(seasonNumber) +
                    "?api_key=" + tmdbKey +
                    "&language=zh";
                requestJson(url, {}, parserOptions, done, fail);
            }

            function requestJson(url, headers, parserOptions, done, fail) {
                requestByType(url, "json", headers, parserOptions, function (data) {
                    if (typeof data !== "string") return done(data);
                    try {
                        done(JSON.parse(data));
                    } catch (e) {
                        fail("VidSrc: JSON parse failed.");
                    }
                }, fail);
            }

            function mergeRequestHeaders(options, headers) {
                var merged = {};
                var key;

                options = options || {};
                if (typeof options.headers === "string") {
                    try {
                        merged = JSON.parse(options.headers);
                    } catch (e) {
                        merged = {};
                    }
                } else if (options.headers && typeof options.headers === "object") {
                    for (key in options.headers) {
                        if (Object.prototype.hasOwnProperty.call(options.headers, key)) merged[key] = options.headers[key];
                    }
                }

                headers = headers || {};
                for (key in headers) {
                    if (Object.prototype.hasOwnProperty.call(headers, key)) merged[key] = headers[key];
                }

                options.headers = merged;
                return options;
            }

            function requestByType(url, dataType, headers, parserOptions, done, fail, method, postBody) {
                parserOptions = parserOptions || {};
                var network = parserOptions.network;
                var config = parserOptions.config || {};
                var helpers = parserOptions.helpers || {};
                var requestConfig = {};
                var requestMethod = String(method || "GET").toUpperCase();
                var bodyToSend = requestMethod === "POST" ? (postBody === undefined || postBody === null ? " " : postBody) : false;
                var key;

                for (key in config) {
                    if (Object.prototype.hasOwnProperty.call(config, key)) requestConfig[key] = config[key];
                }
                requestConfig.headers = headers || {};

                if (requestMethod === "POST") {
                    requestConfig.method = "POST";
                    requestConfig.type = "POST";
                }

                if (helpers.buildRuleRequest && helpers.requestRuleNative) {
                    var request = helpers.buildRuleRequest(url, dataType, requestConfig, {
                        method: requestMethod,
                        type: requestMethod,
                        postData: requestMethod === "POST" ? bodyToSend : ""
                    });
                    request.options = mergeRequestHeaders(request.options, requestConfig.headers);
                    request.options.type = requestMethod;
                    if (request.fallbackOptions) {
                        request.fallbackOptions = mergeRequestHeaders(request.fallbackOptions, requestConfig.headers);
                        request.fallbackOptions.type = requestMethod;
                    }
                    return helpers.requestRuleNative(network, request, done, fail, bodyToSend);
                }

                if (network && network.native) {
                    return network.native(url, done, fail, bodyToSend, {
                        dataType: dataType,
                        headers: requestConfig.headers,
                        type: requestMethod
                    });
                }

                fail("VidSrc: network.native is unavailable.");
            }

            try {
                var info = extractDetailInfo(detailPageUrl);
                var configuredMovieSources;
                var configuredTvSources;
                if (!info.id) return onError("VidSrc: missing TMDB id.");

                if (info.type === "tv") {
                    configuredTvSources = getConfiguredProviderEntries("tv");
                    if (configuredTvSources !== null && !configuredTvSources.length) {
                        return onError("VidSrc: 未配置电视剧播放源，请至少启用一个 tv_series_enable=true 的源。");
                    }

                    return fetchTvDetail(info, options, function (data) {
                        resolveTvEpisodeMap(data, info, options, function (episodeMap) {
                            var lines = buildTvLines(data, info, episodeMap);
                            if (!lines.length) return onError("VidSrc: TV episodes missing.");
                            onSuccess({ data: { list: lines } });
                        });
                    }, function () {
                        onError("VidSrc: TV detail request failed.");
                    });
                }

                configuredMovieSources = getConfiguredProviderEntries("movie");
                if (configuredMovieSources !== null && !configuredMovieSources.length) {
                    return onError("VidSrc: 未配置电影播放源，请至少启用一个 enable=true 的源。");
                }

                fetchMovieDetail(info, options, function (data) {
                    onSuccess({ data: { list: buildMovieLines(info, data) } });
                }, function () {
                    onSuccess({ data: { list: buildMovieLines(info, null) } });
                });
            } catch (e) {
                onError("VidSrc detail error: " + (e && e.message ? e.message : e));
            }
        },
        ikanbot_playlist_direct_v2: function (detailPageUrl, options, onSuccess, onError) {
            var config = options.config || {}, helpers = options.helpers;
            var finished = false;
            function fail(stage, error, message) {
                if (finished) return;
                finished = true;
                onError('ikanbot [' + stage + ']: ' + (message || (error && error.message) || String(error || '请求失败')));
            }
            function request(url, stage, referer, ajax, done) {
                var requestConfig = {}, headers = {};
                Object.keys(config).forEach(function (key) { if (key !== 'headers') requestConfig[key] = config[key]; });
                Object.keys(config.headers || {}).forEach(function (key) {
                    var value = config.headers[key];
                    var name = key.toLowerCase();
                    if (name === 'user-agent') key = 'User-Agent';
                    else if (name === 'cookie') key = 'Cookie';
                    else if (name === 'referer' || name === 'origin' || name === 'x-requested-with') return;
                    headers[key] = value;
                });
                if (!headers['User-Agent']) headers['User-Agent'] = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36';
                if (!headers.Cookie && config.cookie) headers.Cookie = String(config.cookie);
                headers.Referer = referer;
                if (ajax) {
                    headers.Origin = new URL(url).origin;
                    headers['X-Requested-With'] = 'XMLHttpRequest';
                    headers.Accept = 'application/json, text/javascript, */*; q=0.01';
                }
                requestConfig.headers = headers;
                requestConfig.direct = true;
                requestConfig.use_proxy = false;
                requestConfig.site_proxy = '';
                var req = helpers.buildRuleRequest(url, 'text', requestConfig);
                helpers.requestRuleNative(options.network, req, function (body) {
                    if (finished) return;
                    try { done(String(body)); } catch (error) { fail(stage, error); }
                }, function (error, message) { fail(stage, error, message); }, false);
            }
            try {
                var page = new URL(detailPageUrl);
                if (!/^https?:$/.test(page.protocol) || !/^(www|www1)\.ikanbot\.com$/i.test(page.hostname) || !/^\/play\/\d+\/?$/.test(page.pathname)) return fail('详情地址', '不是爱看机器人影片详情地址');
                var origin = page.protocol + '//' + page.host;
                request(page.href, '详情页', origin + '/', false, function (htmlString) {
                    var html = $(htmlString);
                    var videoId = String(html.find('#current_id').val() || '');
                    var encryptedToken = String(html.find('#e_token').val() || '');
                    var mtype = String(html.find('#mtype').val() || '');
                    if (!/^\d{4,}$/.test(videoId) || !encryptedToken || !/^\d+$/.test(mtype)) return fail('详情参数', 'HTML 未包含 current_id、e_token、mtype；请检查返回内容是否为影片页');
                    var token = '', suffix = videoId.slice(-4);
                    for (var i = 0; i < suffix.length; i++) {
                        var offset = Number(suffix.charAt(i)) % 3 + 1;
                        if (encryptedToken.length < offset + 8) return fail('令牌', 'e_token 长度异常');
                        token += encryptedToken.substring(offset, offset + 8);
                        encryptedToken = encryptedToken.substring(offset + 8);
                    }
                    var apiUrl = origin + '/api/getResN?videoId=' + encodeURIComponent(videoId) + '&mtype=' + encodeURIComponent(mtype) + '&token=' + encodeURIComponent(token);
                    request(apiUrl, '线路接口', page.href, true, function (text) {
                        var response;
                        try { response = JSON.parse(text); } catch (error) { return fail('线路接口 JSON', '返回内容不是 JSON'); }
                        if (!response || Number(response.state) !== 1 || !response.data || !Array.isArray(response.data.list)) return fail('线路接口数据', 'state 非成功或缺少 data.list');
                        var groups = [];
                        response.data.list.forEach(function (line, index) {
                            var resources;
                            try { resources = typeof line.resData === 'string' ? JSON.parse(line.resData) : line.resData; }
                            catch (error) { throw new Error('第 ' + (index + 1) + ' 条线路的 resData 不是有效 JSON'); }
                            if (!Array.isArray(resources)) throw new Error('第 ' + (index + 1) + ' 条线路的 resData 不是数组');
                            var items = [];
                            resources.forEach(function (resource) {
                                var name = String(resource.newName || '').trim();
                                var label = name && isNaN(Number(name)) ? name : '';
                                String(resource.url || '').split('#').forEach(function (entry) {
                                    var fields = entry.split('$');
                                    if (fields.length < 2) return;
                                    var title = fields[0].trim(), media = fields[1].trim();
                                    if (!title || !/^https?:\/\//i.test(media) || !/\.m3u8$/i.test(media)) return;
                                    if (label && Number(mtype) === 1) title = label;
                                    else if (label && resources.length > 1) title = label + ' · ' + title;
                                    items.push({ title: title, url: media });
                                });
                            });
                            if (items.length) groups.push({ title: '线路' + (index + 1), items: items });
                        });
                        if (!groups.length) return fail('选集转换', '接口没有可用的 HLS 选集');
                        finished = true;
                        onSuccess({ playlists: groups, seasons: [] });
                    });
                });
            } catch (error) { fail('初始化', error); }
        },
        'ddys_playlist_parser_': function (detailPageUrl, options, onSuccess, onError) {
            function buildLineName(play, epSlug) {
                var srcSite = String((play && play.src_site) || '').trim();
                var language = play && play.language ? String(play.language).trim() : '';
                var prefix = srcSite ? srcSite.charAt(0).toUpperCase() : 'X';
                var name = language ? (prefix + language) : (prefix + '节点');
                if (play && play.is_pv) name = '预告片' + name;
                if (epSlug === 'other' && play && play.name) name = String(play.name).trim() + ' ' + name;
                return name;
            }

            function buildPlayApiUrl(detailId, epSlug) {
                return 'https://ddys.one/ddrk_plays/' + detailId + '/' + epSlug;
            }

            requestStreamNative(
                options,
                detailPageUrl,
                function (htmlString) {
                    try {
                        var detailIdMatch = /\/vod\/(\d+)\/?/i.exec(detailPageUrl || '');
                        if (!detailIdMatch || !detailIdMatch[1]) {
                            onError('ddys: 无法从详情页URL提取 detail id');
                            return;
                        }

                        var detailId = detailIdMatch[1];
                        var $html = $(htmlString || '');
                        var episodes = [];

                        $html.find('.wp-playlist-item[ep_slug]').each(function () {
                            var $item = $(this);
                            var epSlug = String($item.attr('ep_slug') || '').trim();
                            var title = String($item.find('.wp-playlist-caption').text() || '').replace(/\s+/g, ' ').trim();
                            if (epSlug) {
                                episodes.push({
                                    slug: epSlug,
                                    title: title || epSlug
                                });
                            }
                        });

                        if (!episodes.length) {
                            onError('ddys: 详情页未找到 .wp-playlist-item[ep_slug]');
                            return;
                        }

                        var firstEpisode = episodes[0];
                        var firstApiUrl = buildPlayApiUrl(detailId, firstEpisode.slug);

                        var firstApiRequest = options.helpers.buildRuleRequest(firstApiUrl, 'text', options.config);

                        requestRuleNative(
                            options.network,
                            firstApiRequest,
                            function (apiResponse) {
                                try {
                                    var payload = typeof apiResponse === 'string' ? JSON.parse(apiResponse) : apiResponse;
                                    var plays = Array.isArray(payload && payload.video_plays) ? payload.video_plays : [];
                                    if (!plays.length) {
                                        onError('ddys: 首集接口未返回 video_plays');
                                        return;
                                    }

                                    var items = [];
                                    plays.forEach(function (play, index) {
                                        var lineName = buildLineName(play, firstEpisode.slug) || ('线路 ' + (index + 1));
                                        episodes.forEach(function (episode) {
                                            items.push({
                                                line: lineName,
                                                title: episode.title,
                                                url: buildPlayApiUrl(detailId, episode.slug) + '#idx=' + index
                                            });
                                        });
                                    });

                                    onSuccess({ data: { list: items } });
                                } catch (e) {
                                    onError('ddys: 首集接口 JSON 解析失败');
                                }
                            },
                            function (a, c) {
                                onError('ddys: 请求首集接口失败');
                            },
                            false
                        );
                    } catch (e) {
                        onError('ddys: 详情页解析失败');
                    }
                },
                function (a, c) {
                    onError('ddys: 请求详情页失败');
                },
                'text'
            );
        },
    },
    STREAM_PARSERS: {
        'ddys_stream_parser': function (sourceUrl, options, onSuccess, onError) {
            var network = options.network;
            sourceUrl = 'https://cf.aston.rocks/' + sourceUrl;

            function decodeHtml(text) {
                return (text || '').replace(/&amp;/g, '&');
            }

            function findDirectMedia(text) {
                var normalized = decodeHtml(text || '');

                var urlParam = /[?&]url=(https?:\/\/[^"'`\s>]+?\.(?:m3u8|mp4)(?:\?[^"'`\s>]*)?)/i.exec(normalized);
                if (urlParam && urlParam[1]) return urlParam[1];

                var iframeSrc = /<iframe[^>]+src=["']([^"']+)["']/i.exec(normalized);
                if (iframeSrc && iframeSrc[1]) {
                    var iframeUrl = decodeHtml(iframeSrc[1]);
                    var iframeUrlParam = /[?&]url=([^&"'`\s>]+)/i.exec(iframeUrl);
                    if (iframeUrlParam && iframeUrlParam[1]) {
                        try {
                            return decodeURIComponent(iframeUrlParam[1]);
                        } catch (e) {
                            return iframeUrlParam[1];
                        }
                    }
                    var iframeDirect = /(https?:\/\/[^"'`\s>]+?\.(?:m3u8|mp4)(?:\?[^"'`\s>]*)?)/i.exec(iframeUrl);
                    if (iframeDirect && iframeDirect[1]) return iframeDirect[1];
                }

                var direct = /(https?:\/\/[^"'`\s>]+?\.(?:m3u8|mp4)(?:\?[^"'`\s>]*)?)/i.exec(normalized);
                return direct && direct[1] ? direct[1] : '';
            }

            function parsePlayApiResponse(text) {
                try {
                    var data = JSON.parse(text || '{}');
                    var plays = Array.isArray(data.video_plays) ? data.video_plays : [];
                    for (var i = 0; i < plays.length; i += 1) {
                        var item = plays[i] || {};
                        var candidate = item.play_data || item.src || item.url || '';
                        if (candidate) return candidate;
                    }
                    var fallback = findDirectMedia(data.html_content || '');
                    return fallback || '';
                } catch (e) {
                    return findDirectMedia(text || '');
                }
            }

            function fetchPlayApi(url, done, fail) {
                network["native"](
                    url,
                    function (payload) {
                        var direct = parsePlayApiResponse(payload);
                        if (direct) done(direct);
                        else fail('未找到真实播放链接。');
                    },
                    function (a, c) {
                        fail('请求播放页失败: ' + network.errorDecode(a, c));
                    },
                    false,
                    { dataType: 'text' }
                );
            }

            if (/^https?:\/\/[^"'`\s>]+?\.(?:m3u8|mp4)(?:\?[^"'`\s>]*)?$/i.test(sourceUrl || '')) {
                onSuccess(sourceUrl);
                return;
            }

            if (/\/ddrk_plays\/\d+\/[^/?#]+/i.test(sourceUrl || '')) {
                fetchPlayApi(sourceUrl, onSuccess, onError);
                return;
            }

            network["native"](
                sourceUrl,
                function (html) {
                    var pageHtml = html || '';
                    var idMatch = /\/vod\/(\d+)\/?$/i.exec(sourceUrl) || /\/vod\/(\d+)\/?/i.exec(pageHtml);
                    var epMatch = /ep_slug="([^"]+)"/i.exec(pageHtml);
                    var direct = findDirectMedia(pageHtml);

                    if (direct) {
                        onSuccess(direct);
                        return;
                    }

                    if (!idMatch || !idMatch[1] || !epMatch || !epMatch[1]) {
                        onError('未找到 ep_slug 或节目ID。');
                        return;
                    }

                    var apiUrl = sourceUrl.replace(/\/vod\/(\d+)\/?$/i, '/ddrk_plays/' + idMatch[1] + '/' + epMatch[1]);
                    if (!/^https?:\/\//i.test(apiUrl)) {
                        apiUrl = 'https://ddys.one/ddrk_plays/' + idMatch[1] + '/' + epMatch[1];
                    }

                    fetchPlayApi(
                        apiUrl,
                        function (streamUrl) {
                            onSuccess(streamUrl);
                        },
                        function (message) {
                            onError(message);
                        }
                    );
                },
                function (a, c) {
                    onError('请求播放页失败: ' + network.errorDecode(a, c));
                },
                false,
                { dataType: 'text' }
            );
        },
        'nfyingshi_script_parser': function (sourceUrl, options, onSuccess, onError) {
            var network = options.network;
            var config = options.config || {};

            function ensureUrl(url, baseUrl) {
                if (!url) return '';
                if (/^https?:\/\//i.test(url)) return url;
                if (/^\/\//.test(url)) {
                    try { return new URL(baseUrl || sourceUrl).protocol + url; } catch (e) { return 'https:' + url; }
                }
                try { return new URL(url, baseUrl).href; } catch (e) { return url; }
            }

            function buildSiteHeaders(baseLink) {
                var headers = {};
                if (config.headers) {
                    for (var key in config.headers) {
                        if (Object.prototype.hasOwnProperty.call(config.headers, key)) headers[key] = config.headers[key];
                    }
                }
                if (!headers['User-Agent']) {
                    headers['User-Agent'] = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/138.0.0.0 Safari/537.36';
                }
                var refererBase = baseLink || sourceUrl;
                try {
                    headers['Origin'] = new URL(refererBase).origin;
                } catch (e) {
                    headers['Origin'] = refererBase;
                }
                headers['Referer'] = /\/$/.test(refererBase) ? refererBase : refererBase + '/';
                return headers;
            }

            function isFinalMediaUrl(url) {
                return /^https?:\/\//i.test(url || '') && (/(?:\.m3u8|\.mp4|\.m4s|\.webm|\.mpd)(?:[?#]|$)/i.test(url) || /\/\/(?:pan\.quark\.cn|pan\.baidu\.com|drive\.uc\.cn)\//i.test(url));
            }

            function decodeBase64(value) {
                var text = String(value || '').trim();
                if (!/^[A-Za-z0-9+/=_-]{12,}$/.test(text)) return '';
                try {
                    if (typeof atob === 'function') return atob(text);
                } catch (e) { }
                try {
                    if (typeof Buffer !== 'undefined') return Buffer.from(text, 'base64').toString('utf8');
                } catch (e) { }
                return '';
            }

            function decodePlayerUrl(value, baseUrl) {
                var raw = String(value || '').replace(/\\\//g, '/').replace(/&amp;/g, '&').trim();
                var candidates = [raw];
                try { candidates.push(decodeURIComponent(raw)); } catch (e) { }
                var decoded = decodeBase64(raw);
                if (decoded) {
                    decoded = decoded.replace(/\\\//g, '/').replace(/&amp;/g, '&').trim();
                    try { candidates.push(decodeURIComponent(decoded)); } catch (e) { }
                    candidates.push(decoded);
                }
                for (var i = 0; i < candidates.length; i += 1) {
                    var candidate = ensureUrl(candidates[i], baseUrl);
                    if (isFinalMediaUrl(candidate)) return candidate;
                }
                return '';
            }

            function extractPlayableUrl(text, baseUrl) {
                var normalized = String(text || '')
                    .replace(/\n|\r/g, '')
                    .replace(/\\u([0-9a-fA-F]{4})/g, function (_, h) { return String.fromCharCode(parseInt(h, 16)); })
                    .replace(/\\\//g, '/')
                    .replace(/\\/g, '')
                    .replace(/&amp;/g, '&');
                var mediaMatch = /['"](((?:https?:)?\/\/[^'"\s]*\.(?:m3u8|mp4|m4s|webm|mpd)(?:\?[^'"\s>]*)?))['"]/i.exec(normalized);
                if (mediaMatch && mediaMatch[1]) return mediaMatch[1];
                var shareMatch = /['"]((https?:\/\/(?:pan\.quark\.cn|pan\.baidu\.com|drive\.uc\.cn)[^'"\s]*))['"]/i.exec(normalized);
                if (shareMatch && shareMatch[1]) return shareMatch[1];
                var looseMedia = /((?:https?:)?\/\/[^'"\s,]+\.(?:m3u8|mp4|m4s|webm|mpd)(?:\?[^'"\s>]*)?)/i.exec(normalized);
                if (looseMedia && looseMedia[1]) return looseMedia[1];
                return '';
            }

            function extractPlayerUrl(text, baseUrl) {
                var normalized = String(text || '').replace(/\n|\r/g, '').replace(/\\\//g, '/').replace(/&amp;/g, '&');
                var urlMatch = /(?:["']?url["']?\s*:\s*["']([^"']+)["'])/i.exec(normalized);
                if (urlMatch && urlMatch[1]) {
                    var decoded = decodePlayerUrl(urlMatch[1], baseUrl);
                    if (decoded) return decoded;
                }
                var srcMatch = /(?:["']?src["']?\s*:\s*["']([^"']+)["'])/i.exec(normalized);
                if (srcMatch && srcMatch[1]) {
                    var decodedSrc = decodePlayerUrl(srcMatch[1], baseUrl);
                    if (decodedSrc) return decodedSrc;
                }
                return '';
            }

            function inspectHtml(html, baseUrl) {
                var direct = extractPlayableUrl(html, baseUrl);
                if (direct) return ensureUrl(direct, baseUrl);
                var playerUrl = extractPlayerUrl(html, baseUrl);
                if (playerUrl) return playerUrl;
                return '';
            }

            function findEncryptedPlayer(html, baseUrl) {
                var source = String(html || '');
                var encryptedMatch = /var\s+([A-Za-z_$][\w$]*)\s*=\s*["']([A-Za-z0-9+/=]{64,})["']\s*;\s*var\s+([A-Za-z_$][\w$]*)\s*=\s*function\s+dncry[\s\S]*?eval\s*\(\s*\3\s*\(\s*\1\s*\)\s*\)/i.exec(source);
                if (!encryptedMatch) return null;
                var block = encryptedMatch[0] || '';
                var values = [];
                var parseRe = /Utf8\.parse\(\s*["']?([^"')]+)["']?\s*\)/ig;
                var parseMatch;
                while ((parseMatch = parseRe.exec(block))) {
                    if (parseMatch[1]) values.push(String(parseMatch[1]));
                }
                if (!values[0] || !values[1]) return null;
                var md5Script = /<script[^>]+src=["']([^"']*md5[^"']*\.js[^"']*)["'][^>]*>/i.exec(source);
                return {
                    cipherText: encryptedMatch[2],
                    key: values[0],
                    iv: values[1],
                    scriptUrl: ensureUrl(md5Script && md5Script[1] ? md5Script[1] : '/wp-content/themes/mibt/assets/js/md5.js', baseUrl)
                };
            }

            function loadMd5Crypto(scriptUrl, done, fail) {
                var root = (typeof globalThis !== 'undefined') ? globalThis : (typeof window !== 'undefined' ? window : this);
                if (root && root.md5 && root.md5.AES) {
                    done(root.md5);
                    return;
                }
                network["native"](scriptUrl, function (scriptText) {
                    try {
                        var lib = Function(
                            'window',
                            'self',
                            'globalThis',
                            String(scriptText || '') + '; return (typeof md5 !== "undefined" ? md5 : (globalThis && globalThis.md5));'
                        )(root, root, root);
                        if (root && lib && !root.md5) root.md5 = lib;
                        if (lib && lib.AES && lib.enc && lib.enc.Utf8) {
                            done(lib);
                            return;
                        }
                        fail('解析失败：md5 AES 库加载后不可用。');
                    } catch (e) {
                        fail('解析失败：执行 md5 AES 库失败 - ' + (e && e.message ? e.message : e));
                    }
                }, function (a, c) {
                    fail('请求 md5 AES 库失败: ' + network.errorDecode(a, c));
                }, false, { dataType: 'text', headers: buildSiteHeaders(scriptUrl) });
            }

            function decryptEncryptedPlayer(html, baseUrl, done, fail, next) {
                var encrypted = findEncryptedPlayer(html, baseUrl);
                if (!encrypted) {
                    next();
                    return;
                }
                loadMd5Crypto(encrypted.scriptUrl, function (md5) {
                    try {
                        var key = md5.enc.Utf8.parse(String(encrypted.key || ''));
                        var iv = md5.enc.Utf8.parse(String(encrypted.iv || ''));
                        var decrypted = md5.AES.decrypt(encrypted.cipherText, key, {
                            iv: iv,
                            mode: md5.mode.CBC,
                            padding: md5.pad.Pkcs7
                        }).toString(md5.enc.Utf8);
                        var direct = inspectHtml(decrypted, baseUrl);
                        if (direct) {
                            done(direct);
                            return;
                        }
                        fail('解析失败：加密播放配置解密后未找到可用播放链接。');
                    } catch (e) {
                        fail('解析失败：解密播放配置失败 - ' + (e && e.message ? e.message : e));
                    }
                }, fail);
            }

            function fetchAndProbe(pageUrl, baseUrl, done, fail) {
                network["native"](pageUrl, function (html) {
                    var source = String(html || '');
                    if (/登录后即可观看|登录后可观看|请先登录|会员登录/i.test(source)) {
                        fail('播放页需要登录后才能观看。');
                        return;
                    }
                    var direct = inspectHtml(source, baseUrl);
                    if (direct) {
                        done(direct);
                        return;
                    }
                    decryptEncryptedPlayer(source, baseUrl, done, fail, function () {
                        var iframe = /<iframe[^>]+src=["']([^"']+)["']/i.exec(source);
                        if (iframe && iframe[1]) {
                            var iframeUrl = ensureUrl(iframe[1], baseUrl);
                            network["native"](iframeUrl, function (iframeHtml) {
                                var iframeSource = String(iframeHtml || '');
                                var nested = inspectHtml(iframeSource, iframeUrl);
                                if (nested) {
                                    done(nested);
                                    return;
                                }
                                var nestedIframe = /<iframe[^>]+src=["']([^"']+)["']/i.exec(iframeSource);
                                if (nestedIframe && nestedIframe[1]) {
                                    var nestedIframeUrl = ensureUrl(nestedIframe[1], iframeUrl);
                                    network["native"](nestedIframeUrl, function (lastHtml) {
                                        var lastDirect = inspectHtml(String(lastHtml || ''), nestedIframeUrl);
                                        if (lastDirect) done(lastDirect);
                                        else fail('解析失败：iframe 页面未找到可用播放链接。');
                                    }, function (a, c) {
                                        fail('请求二级 iframe 失败: ' + network.errorDecode(a, c));
                                    }, false, { dataType: 'text', headers: buildSiteHeaders(iframeUrl) });
                                    return;
                                }
                                fail('解析失败：iframe 页面未找到可用播放链接。');
                            }, function (a, c) {
                                fail('请求 iframe 失败: ' + network.errorDecode(a, c));
                            }, false, { dataType: 'text', headers: buildSiteHeaders(baseUrl) });
                            return;
                        }
                        fail('解析失败：未找到可用播放链接。');
                    });
                }, function (a, c) {
                    fail('请求播放页失败: ' + network.errorDecode(a, c));
                }, false, { dataType: 'text', headers: buildSiteHeaders(baseUrl) });
            }

            fetchAndProbe(
                sourceUrl,
                config.link || sourceUrl,
                function (streamUrl) {
                    onSuccess(streamUrl);
                },
                function (message) {
                    onError(message);
                }
            );
        },
        '1234yy_script_parser': function (sourceUrl, options, onSuccess, onError) {
            options = options || {};
            var network = options.network;
            var config = options.config || {};
            var helpers = options.helpers || {};
            var playerConfigVar = "player_aaaa";
            var playerUrlPath = playerConfigVar ? playerConfigVar + '.url' : 'player.url';
            var tokenApiUrlTemplate = "https://v.70066.cc/video/v/{token}";
            if (!network || typeof network["native"] !== 'function') {
                onError('1234yy: network.native 不可用。');
                return;
            }
            function escapeRegExp(value) {
                return String(value || '').replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
            }
            function extractAssignedObject(source, varName) {
                source = String(source || '');
                if (!varName) return '';
                var assignRe = new RegExp('(?:(?:var|let|const)\\s+)?' + escapeRegExp(varName) + '\\s*=\\s*', 'i');
                var match = assignRe.exec(String(source || ''));
                if (!match) return '';
                var start = match.index + match[0].length;
                while (source.charAt(start) && /\s/.test(source.charAt(start))) start += 1;
                if (source.charAt(start) !== '{') return '';
                var depth = 0;
                var inSingle = false;
                var inDouble = false;
                var escaped = false;
                for (var i = start; i < source.length; i += 1) {
                    var ch = source.charAt(i);
                    if (escaped) {
                        escaped = false;
                        continue;
                    }
                    if (ch === '\\') {
                        escaped = true;
                        continue;
                    }
                    if (inSingle) {
                        if (ch === "'") inSingle = false;
                        continue;
                    }
                    if (inDouble) {
                        if (ch === '"') inDouble = false;
                        continue;
                    }
                    if (ch === "'") {
                        inSingle = true;
                        continue;
                    }
                    if (ch === '"') {
                        inDouble = true;
                        continue;
                    }
                    if (ch === '{') depth += 1;
                    if (ch === '}') {
                        depth -= 1;
                        if (depth === 0) return source.slice(start, i + 1);
                    }
                }
                return '';
            }
            function originOf(url) {
                var match = /^(https?:\/\/[^\/?#]+)/i.exec(String(url || ''));
                return match ? match[1] : '';
            }
            function absoluteUrl(url) {
                url = String(url || '').trim();
                if (!url) return '';
                if (/^https?:\/\//i.test(url)) return url;
                var baseLink = config.link || sourceUrl || '';
                var root = originOf(baseLink);
                if (/^\/\//.test(url)) {
                    var scheme = /^http:\/\//i.test(baseLink) ? 'http:' : 'https:';
                    return scheme + url;
                }
                if (!root) return url;
                if (url.charAt(0) === '/') return root + url;
                return root + '/' + url.replace(/^\.\//, '');
            }
            function absoluteUrlFrom(url, baseUrl) {
                url = String(url || '').trim();
                if (!url) return '';
                if (/^https?:\/\//i.test(url)) return url;
                if (/^\/\//.test(url)) {
                    var scheme = /^http:\/\//i.test(baseUrl || sourceUrl || config.link || '') ? 'http:' : 'https:';
                    return scheme + url;
                }
                var root = originOf(baseUrl || config.link || sourceUrl || '');
                if (!root) return url;
                if (url.charAt(0) === '/') return root + url;
                return root + '/' + url.replace(/^\.\//, '');
            }
            function cleanPlayableUrl(value) {
                var url = String(value || '').replace(/\n|\r/g, '').replace(/\\u([0-9a-fA-F]{4})/g, function (_, h) {
                    return String.fromCharCode(parseInt(h, 16));
                }).replace(/\\x([0-9a-fA-F]{2})/g, function (_, h) {
                    return String.fromCharCode(parseInt(h, 16));
                }).replace(/\\\//g, '/').replace(/\\"/g, '"').replace(/\\'/g, "'").replace(/&amp;/g, '&').trim();
                try { url = decodeURIComponent(url); } catch (e) { }
                return url;
            }
            function isPlayableUrl(url) {
                return /^https?:\/\//i.test(url || '') && (
                    /(?:\.m3u8|\.mp4|\.m4s|\.webm|\.mpd)(?:[?#]|$)/i.test(url)
                    || /^https?:\/\/[^'"`<> ]+(?:\/video\/tos\/|\/obj\/tos-|\/obj\/tos_|tos-[a-z0-9-]+)[^'"`<> ]*$/i.test(url)
                );
            }
            function cloneRequestConfig(headers) {
                var requestConfig = {};
                var key;
                for (key in config) {
                    if (Object.prototype.hasOwnProperty.call(config, key)) requestConfig[key] = config[key];
                }
                if (headers) requestConfig.headers = headers;
                return requestConfig;
            }
            function requestText(url, headers, done, fail) {
                var requestConfig = cloneRequestConfig(headers);
                var request;
                if (helpers.buildRuleRequest && helpers.requestRuleNative) {
                    request = helpers.buildRuleRequest(url, 'text', requestConfig);
                    helpers.requestRuleNative(network, request, done, fail, false);
                    return;
                }
                network["native"](url, done, fail, false, { dataType: 'text', headers: headers });
            }
            function decodeBase64(value) {
                var text = String(value || '').trim();
                if (!text) return '';
                try {
                    if (typeof atob === 'function') return atob(text);
                } catch (e) { }
                try {
                    if (typeof Buffer !== 'undefined') return Buffer.from(text, 'base64').toString('utf8');
                } catch (e) { }
                return '';
            }
            function looseUnescape(value) {
                value = String(value || '');
                try {
                    if (typeof unescape === 'function') return unescape(value);
                } catch (e) { }
                try { return decodeURIComponent(value); } catch (e2) { }
                return value;
            }
            function decodeMacPlayerUrl(value, encrypt) {
                var url = cleanPlayableUrl(value);
                var mode = String(encrypt === undefined || encrypt === null ? '' : encrypt);
                if (mode === '1') {
                    url = looseUnescape(url);
                } else if (mode === '2') {
                    url = looseUnescape(decodeBase64(url) || url);
                }
                return cleanPlayableUrl(url);
            }
            function readObjectProperty(objectText, key) {
                var pattern = new RegExp("[\"']?" + escapeRegExp(key) + "[\"']?\\s*:\\s*(?:\"((?:\\\\.|[^\"\\\\])*)\"|'((?:\\\\.|[^'\\\\])*)'|([^,}\\s]+))", 'i');
                var match = pattern.exec(String(objectText || ''));
                if (!match) return '';
                return cleanPlayableUrl(match[1] || match[2] || match[3] || '');
            }
            function parsePlayerObjectText(objectText) {
                var player;
                if (!objectText) return null;
                try {
                    player = JSON.parse(objectText);
                } catch (e) {
                    player = null;
                }
                if (!player) {
                    player = {
                        url: readObjectProperty(objectText, 'url'),
                        from: readObjectProperty(objectText, 'from'),
                        encrypt: readObjectProperty(objectText, 'encrypt')
                    };
                }
                if (!player || !player.url) return null;
                player.url = decodeMacPlayerUrl(player.url, player.encrypt);
                return player;
            }
            function readPlayerConfig(html) {
                var source = String(html || '');
                var exactText = extractAssignedObject(source, playerConfigVar);
                if (exactText) {
                    var exactPlayer = parsePlayerObjectText(exactText);
                    if (exactPlayer && exactPlayer.url) return exactPlayer;
                }
                var configRe = /(?:var|let|const)\s+([A-Za-z_$][A-Za-z0-9_$]*)\s*=\s*\{[\s\S]*?["']?url["']?\s*:\s*["']([^"']+)/ig;
                var fallbackPlayer = null;
                var match;
                while ((match = configRe.exec(source))) {
                    var varName = String(match[1] || '');
                    var url = match && match[2] ? cleanPlayableUrl(match[2]) : '';
                    if (!url) continue;
                    var candidate = { url: url };
                    if (playerConfigVar && varName === playerConfigVar) return candidate;
                    if (!fallbackPlayer && /^player_/i.test(varName)) fallbackPlayer = candidate;
                }
                return fallbackPlayer;
            }
            function readApiUrl(jsonText, apiUrl) {
                var payload = jsonText;
                if (typeof payload === 'string') {
                    try { payload = JSON.parse(payload); } catch (e) { payload = null; }
                }
                var url = payload && payload.url ? cleanPlayableUrl(payload.url) : '';
                return url ? absoluteUrlFrom(url, apiUrl) : '';
            }
            function buildTokenApiUrl(token) {
                token = String(token || '').trim();
                if (!token) return '';
                if (tokenApiUrlTemplate && tokenApiUrlTemplate.indexOf('{token}') >= 0) {
                    return tokenApiUrlTemplate.replace('{token}', encodeURIComponent(token));
                }
                return 'https://v.70066.cc/video/v/' + encodeURIComponent(token);
            }
            function resolveMacPlayerToken(player, refererUrl, handled) {
                var playerFrom = String(player && player.from || '').toLowerCase();
                var token = decodeMacPlayerUrl(player && player.url || '', player && player.encrypt);
                if (!token || isPlayableUrl(token) || playerFrom !== 'ucyunbo') return false;
                handled.value = true;
                var apiUrl = buildTokenApiUrl(token);
                var apiHeaders = {};
                apiHeaders['Accept'] = 'application/json';
                apiHeaders['Referer'] = absoluteUrlFrom('/static/player/videoparse.html?v=' + encodeURIComponent(token), refererUrl);
                apiHeaders['Origin'] = originOf(apiHeaders['Referer']) || originOf(refererUrl);
                requestText(apiUrl, apiHeaders, function (jsonText) {
                    var url = readApiUrl(jsonText, apiUrl);
                    if (isPlayableUrl(url)) return onSuccess(url);
                    onError('解析失败：ucyunbo token API 未返回播放链接。');
                }, function (a, c) {
                    onError('请求 ucyunbo token API 失败: ' + network.errorDecode(a, c));
                });
                return true;
            }
            var directSourceUrl = cleanPlayableUrl(sourceUrl);
            if (isPlayableUrl(directSourceUrl)) return onSuccess(directSourceUrl);
            var requestUrl = absoluteUrl(sourceUrl);
            if (!requestUrl) return onError('解析失败：播放页地址为空。');
            var headers = {};
            if (config.headers) {
                for (var key in config.headers) {
                    if (Object.prototype.hasOwnProperty.call(config.headers, key)) headers[key] = config.headers[key];
                }
            }
            if (!headers['User-Agent']) {
                headers['User-Agent'] = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/138.0.0.0 Safari/537.36';
            }
            headers['Referer'] = requestUrl;
            headers['Origin'] = originOf(requestUrl) || originOf(config.link || '');
            requestText(requestUrl, headers, function (html) {
                var player = readPlayerConfig(html);
                var url = player && player.url ? decodeMacPlayerUrl(player.url, player.encrypt) : '';
                if (isPlayableUrl(url)) return onSuccess(url);
                var handled = { value: false };
                if (player && resolveMacPlayerToken(player, requestUrl, handled)) return;
                onError('解析失败：未找到 ' + playerUrlPath + ' 播放链接。');
            }, function (a, c) {
                onError('请求播放页失败: ' + network.errorDecode(a, c));
            });
        },
        '88kanqiu_stream_parser': function (sourceUrl, options, onSuccess, onError) {
            try {
                options = options || {};
                onSuccess = onSuccess || function () { };
                onError = onError || function () { };
                sourceUrl = String(sourceUrl || '');
                var runtimeNetwork = options.network || (typeof network !== 'undefined' ? network : null);
                var config = options.config || {};
                var helpers = options.helpers || {};

                function ensureUrl(url, baseUrl) {
                    if (!url) return '';
                    if (/^https?:\/\//i.test(url)) return url;
                    if (/^\/\//.test(url)) {
                        try { return new URL(baseUrl || sourceUrl).protocol + url; } catch (e) { return 'https:' + url; }
                    }
                    try { return new URL(url, baseUrl || sourceUrl).href; } catch (e) { return url; }
                }

                function originOf(url) {
                    try { return new URL(url).origin; } catch (e) { return ''; }
                }

                function buildHeaders(refererUrl) {
                    var headers = {};
                    if (config.headers) {
                        for (var key in config.headers) {
                            if (Object.prototype.hasOwnProperty.call(config.headers, key)) headers[key] = config.headers[key];
                        }
                    }
                    if (!headers['User-Agent'] && !headers['user-agent']) {
                        headers['User-Agent'] = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/138.0.0.0 Safari/537.36';
                    }
                    headers['Referer'] = refererUrl || sourceUrl;
                    var origin = originOf(headers['Referer']);
                    if (origin) headers['Origin'] = origin;
                    return headers;
                }

                function cloneRequestConfig(headers) {
                    var requestConfig = {};
                    var key;
                    for (key in config) {
                        if (Object.prototype.hasOwnProperty.call(config, key)) requestConfig[key] = config[key];
                    }
                    if (headers) requestConfig.headers = headers;
                    return requestConfig;
                }

                function requestText(url, headers, done, fail) {
                    var requestConfig = cloneRequestConfig(headers);
                    var request;
                    if (helpers.buildRuleRequest && helpers.requestRuleNative) {
                        request = helpers.buildRuleRequest(url, 'text', requestConfig);
                        helpers.requestRuleNative(runtimeNetwork, request, done, fail, false);
                        return;
                    }
                    runtimeNetwork['native'](url, done, fail, false, { dataType: 'text', headers: headers });
                }

                function cleanUrl(value) {
                    var url = String(value || '')
                        .replace(/\\u0026/g, '&')
                        .replace(/\\\//g, '/')
                        .replace(/&amp;/g, '&')
                        .trim();
                    try { url = decodeURIComponent(url); } catch (e) { }
                    return url;
                }

                function isFinalMediaUrl(url) {
                    if (!/^https?:\/\//i.test(url || '')) return false;
                    try {
                        return /(?:\.m3u8|\.mp4|\.m4s|\.webm|\.mpd)$/i.test(new URL(url).pathname || '');
                    } catch (e) {
                        return /(?:\.m3u8|\.mp4|\.m4s|\.webm|\.mpd)(?:[?#]|$)/i.test(url);
                    }
                }

                function queryParam(url, name) {
                    try { return new URL(url, sourceUrl).searchParams.get(name) || ''; } catch (e) { }
                    var match = new RegExp('[?&]' + name + '=([^&#]+)', 'i').exec(String(url || ''));
                    return match && match[1] ? match[1] : '';
                }

                function unwrapMediaUrl(url, baseUrl) {
                    var direct = cleanUrl(url);
                    if (isFinalMediaUrl(direct)) return ensureUrl(direct, baseUrl);
                    var wrapped = queryParam(direct, 'url');
                    if (wrapped) {
                        wrapped = cleanUrl(wrapped);
                        if (isFinalMediaUrl(wrapped)) return ensureUrl(wrapped, baseUrl);
                    }
                    return '';
                }

                function extractPlayableUrl(text, baseUrl) {
                    var normalized = String(text || '')
                        .replace(/\n|\r/g, '')
                        .replace(/\\u([0-9a-fA-F]{4})/g, function (_, h) { return String.fromCharCode(parseInt(h, 16)); })
                        .replace(/\\\//g, '/')
                        .replace(/&amp;/g, '&');

                    var fieldMatch = /(?:PlayUrl|playurl|play_url|video_url|videoUrl|player_url|src|url)\s*[:=]\s*['"]([^'"]+)['"]/i.exec(normalized);
                    if (fieldMatch && fieldMatch[1]) {
                        var fieldUrl = unwrapMediaUrl(fieldMatch[1], baseUrl) || cleanUrl(fieldMatch[1]);
                        if (isFinalMediaUrl(fieldUrl)) return ensureUrl(fieldUrl, baseUrl);
                    }

                    var mediaMatch = /((?:https?:)?\/\/[^'"\s<>]+?\.(?:m3u8|mp4|m4s|webm|mpd)(?:\?[^'"\s<>]*)?)/i.exec(normalized);
                    if (mediaMatch && mediaMatch[1]) return ensureUrl(cleanUrl(mediaMatch[1]), baseUrl);

                    var wrapperMatch = /((?:https?:)?\/\/[^'"\s<>]+?m3u8\.html\?url=[^'"\s<>]+)/i.exec(normalized);
                    if (wrapperMatch && wrapperMatch[1]) {
                        var unwrapped = unwrapMediaUrl(wrapperMatch[1], baseUrl);
                        if (unwrapped) return unwrapped;
                    }

                    return '';
                }

                function fetchAndScan(pageUrl, depth) {
                    if (!runtimeNetwork || !runtimeNetwork['native']) {
                        onError('88kanqiu: 缺少 network.native');
                        return;
                    }
                    requestText(
                        pageUrl,
                        buildHeaders(pageUrl),
                        function (html) {
                            var direct = extractPlayableUrl(html, pageUrl);
                            if (direct) {
                                onSuccess(direct);
                                return;
                            }
                            if (depth > 0) {
                                var iframe = /<iframe[^>]+src=["']([^"']+)["']/i.exec(String(html || ''));
                                if (iframe && iframe[1]) {
                                    fetchAndScan(ensureUrl(iframe[1], pageUrl), depth - 1);
                                    return;
                                }
                            }
                            if (/^https?:\/\//i.test(sourceUrl || '') && !/sportsteam368\.com/i.test(sourceUrl)) {
                                onSuccess(sourceUrl);
                                return;
                            }
                            onError('88kanqiu: 未找到可播放媒体链接');
                        },
                        function (a, c) {
                            var decode = runtimeNetwork.errorDecode ? runtimeNetwork.errorDecode(a, c) : String(a || c || 'network error');
                            onError('88kanqiu: 请求播放页失败 - ' + decode);
                        }
                    );
                }

                var immediate = unwrapMediaUrl(sourceUrl, sourceUrl);
                if (immediate) {
                    onSuccess(immediate);
                    return;
                }
                fetchAndScan(sourceUrl, 1);
            } catch (e) {
                (onError || function () { })('88kanqiu_stream_parser: ' + (e && e.message ? e.message : e));
            }
        },
        sorani_stream_parser: function (sourceUrl, options, onSuccess, onError) {
            var net = options && options.network ? options.network : (typeof network !== 'undefined' ? network : null);
            var helpers = options && options.helpers ? options.helpers : {};
            var config = options && options.config ? options.config : {};
            if (!net || !net.native) {
                onError('Sorani: network.native 不可用');
                return;
            }

            function apiBase() {
                return 'https://api.sorani.cc/sorani-cms';
            }

            function buildHeaders(referer) {
                return {
                    'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/139.0 Safari/537.36',
                    'Accept': 'application/json, text/plain, */*',
                    'Origin': 'https://www.sorani.net',
                    'Referer': referer || 'https://www.sorani.net/anime/explore'
                };
            }

            function buildRequestConfig(referer) {
                var requestConfig = {};
                var key;

                for (key in config) {
                    if (Object.prototype.hasOwnProperty.call(config, key)) requestConfig[key] = config[key];
                }

                requestConfig.headers = buildHeaders(referer);
                return requestConfig;
            }

            function requestJson(url, referer, done, fail) {
                var requestConfig = buildRequestConfig(referer);
                var request;

                if (helpers.buildRuleRequest && helpers.requestRuleNative) {
                    request = helpers.buildRuleRequest(url, 'json', requestConfig);
                    helpers.requestRuleNative(net, request, done, fail, false);
                    return;
                }

                net.native(url, done, fail, false, { dataType: 'json', headers: requestConfig.headers });
            }

            function parseJson(payload) {
                if (payload && typeof payload === 'object') return payload;
                try { return JSON.parse(String(payload || '')); } catch (e) { return null; }
            }

            function isFinalMediaUrl(url) {
                return /^https?:\/\//i.test(url || '') && /\.(?:m3u8|mp4|m4s|webm|mpd)(?:[?#]|$)/i.test(url || '');
            }

            function cacheStore() {
                var root = typeof globalThis !== 'undefined' ? globalThis : (typeof window !== 'undefined' ? window : this);
                if (!root.__sorani_play_cache) root.__sorani_play_cache = {};
                return root.__sorani_play_cache;
            }

            function getCachedMedia(episodeId) {
                var item = cacheStore()[String(episodeId)];
                if (!item || !item.url || !item.time) return '';
                if (Date.now() - item.time > 10 * 60 * 1000) return '';
                return isFinalMediaUrl(item.url) ? item.url : '';
            }

            function setCachedMedia(episodeId, url) {
                if (!episodeId || !isFinalMediaUrl(url)) return;
                cacheStore()[String(episodeId)] = { url: url, time: Date.now() };
            }

            function parseSource(value) {
                var text = String(value || '');
                var directEpisode = /\/api\/video\/episode\/(\d+)\/play/i.exec(text) || /[?&]episodeId=(\d+)/i.exec(text);
                if (directEpisode && directEpisode[1]) {
                    return { episodeId: directEpisode[1] };
                }
                var pageMatch = /\/anime\/mal\/(\d+)\/episode\/(\d+)/i.exec(text);
                if (pageMatch && pageMatch[1] && pageMatch[2]) {
                    return { videoId: pageMatch[1], episodeOrder: pageMatch[2] };
                }
                return {};
            }

            function requestPlayUrl(episodeId, referer) {
                var cached = getCachedMedia(episodeId);
                if (cached) {
                    onSuccess(cached);
                    return;
                }

                var playApi = apiBase() + '/api/video/episode/' + episodeId + '/play';
                requestJson(playApi, referer || sourceUrl, function (resp) {
                    var payload = parseJson(resp);
                    var data = payload && payload.data ? payload.data : null;
                    var playUrl = data && data.playUrl ? String(data.playUrl) : '';
                    if (playUrl && isFinalMediaUrl(playUrl)) {
                        setCachedMedia(episodeId, playUrl);
                        onSuccess("https://cf.aston.rocks/param/origin=" + encodeURIComponent("https://www.sorani.net") + "/" + "param/referer=" + encodeURIComponent("https://www.sorani.net/") + "/" + playUrl);
                        return;
                    }
                    onError('Sorani: 播放接口未返回可用 playUrl');
                }, function (a, c) {
                    onError('Sorani: 请求播放接口失败 - ' + (net.errorDecode ? net.errorDecode(a, c) : 'network error'));
                });
            }

            function resolveEpisodeId(videoId, episodeOrder) {
                var detailApi = apiBase() + '/api/video/' + videoId;
                requestJson(detailApi, sourceUrl, function (resp) {
                    var payload = parseJson(resp);
                    var data = payload && payload.data ? payload.data : null;
                    var episodes = data && Array.isArray(data.episodes) ? data.episodes : [];
                    var wanted = String(episodeOrder);
                    var found = null;
                    for (var i = 0; i < episodes.length; i += 1) {
                        var episode = episodes[i];
                        if (!episode) continue;
                        if (String(episode.episodeOrder) === wanted || String(parseInt(episode.episodeOrder, 10)) === wanted) {
                            found = episode;
                            break;
                        }
                    }
                    if (!found || !found.episodeId) {
                        onError('Sorani: 未能匹配 episodeOrder ' + wanted);
                        return;
                    }
                    requestPlayUrl(found.episodeId, sourceUrl);
                }, function (a, c) {
                    onError('Sorani: 请求详情接口失败 - ' + (net.errorDecode ? net.errorDecode(a, c) : 'network error'));
                });
            }

            if (isFinalMediaUrl(sourceUrl)) {
                onSuccess(sourceUrl);
                return;
            }

            var parsed = parseSource(sourceUrl);
            if (parsed.episodeId) {
                requestPlayUrl(parsed.episodeId, sourceUrl);
                return;
            }
            if (parsed.videoId && parsed.episodeOrder) {
                resolveEpisodeId(parsed.videoId, parsed.episodeOrder);
                return;
            }

            onError('Sorani: 不支持的播放地址 ' + sourceUrl);
        },
        'olehdtv_parser': function (sourceUrl, options, onSuccess, onError) {
            var network = options.network;
            var config = options.config; // 当前网站的配置

            requestStreamNative(options, sourceUrl, function (data) {
                var html = JSON.parse(data.match(/r player_.*?=(.*?)</)[1]);
                var url = html.url;
                var from = html.from;
                var next = html.link_next;
                var id = html.id;
                var nid = html.nid;
                if (html.encrypt == '1') {
                    url = unescape(url)
                } else if (html.encrypt == '2') {
                    url = unescape(Lampa.Base64.decode(url))
                };
                if (/\.m3u8|\\.mp4/.test(url)) {
                    onSuccess(url);
                } else {
                    onError(config.title + ": 视频链接解析失败");
                }
            }, function (a, c) {
                onError(config.title + ": 视频链接解析失败")
            }, 'text');
        },

        'feikuai_parser': function (sourceUrl, options, onSuccess, onError) {
            var network = options.network;
            var config = options.config; // 当前网站的配置

            requestStreamNative(options, sourceUrl, function (data) {
                var html = JSON.parse(data.match(/r player_.*?=(.*?)</)[1]);
                var url = html.url;
                var from = html.from;
                var next = html.link_next;
                var id = html.id;
                var nid = html.nid;
                if (html.encrypt == '1') {
                    url = unescape(url)
                } else if (html.encrypt == '2') {
                    url = unescape(Lampa.Base64.decode(url))
                };
                if (/\.m3u8|\\.mp4/.test(url)) {
                    onSuccess(url);
                } else {
                    onError(config.title + ": 视频链接解析失败");
                }
            }, function (a, c) {
                onError(config.title + ": 视频链接解析失败")
            }, 'text');
        },

        'duboku_parser': function (sourceUrl, options, onSuccess, onError) {
            var network = options.network;
            var config = options.config; // 当前网站的配置
            var helpers = options.helpers; // 包含所有辅助方法的对象

            // 调用辅助方法
            var decoded = helpers.base64Decode;

            requestStreamNative(options, sourceUrl, function (data) {
                var html = JSON.parse(data.match(/r player_.*?=(.*?)</)[1]);
                var url = html.url;

                if (html.encrypt == '1') {
                    url = unescape(url)
                } else if (html.encrypt == '2') {
                    url = unescape(Lampa.Base64.decode(url))
                }

                if (url) {
                    onSuccess('https://cf.aston.rocks/' + url);
                } else onError(config.title + ": 视频链接解析失败");
            }, function (a, c) {
                // Lampa.Noty.show(network.errorDecode(a, c)); 
                onError(config.title + ": 视频链接解析失败");
            }, 'text');
        },

        'huavod_resolve_parser': function (sourceUrl, options, onSuccess, onError) {
            try {
                options = options || {};
                var network = options.network;
                var config = options.config || {};
                var helpers = options.helpers || {};
                if (!network || !network.native) return onError('huavod: 缺少 network.native');

                function originOf(url) {
                    var m = /^(https?:\/\/[^\/?#]+)/i.exec(String(url || ''));
                    return m ? m[1] : '';
                }

                function ensureUrl(url, baseUrl) {
                    url = String(url || '').trim();
                    if (!url) return '';
                    if (/^https?:\/\//i.test(url)) return url;
                    if (/^\/\//.test(url)) return (/^http:\/\//i.test(baseUrl || sourceUrl) ? 'http:' : 'https:') + url;
                    var root = originOf(baseUrl || config.link || sourceUrl || '');
                    if (!root) return url;
                    return url.charAt(0) === '/' ? root + url : root + '/' + url.replace(/^\.\//, '');
                }

                function cleanUrl(value) {
                    var url = String(value || '')
                        .replace(/\\u([0-9a-fA-F]{4})/g, function (_, h) { return String.fromCharCode(parseInt(h, 16)); })
                        .replace(/\\\//g, '/')
                        .replace(/&amp;/g, '&')
                        .trim();
                    try { url = decodeURIComponent(url); } catch (e) { }
                    return url;
                }

                function isFinalMediaUrl(url) {
                    return /^https?:\/\//i.test(url || '') && /(?:\.m3u8|\.mp4|\.m4s|\.webm|\.mpd)(?:[?#]|$)/i.test(url);
                }

                function copyHeaders(refererUrl, extra) {
                    var headers = {};
                    if (config.headers) {
                        for (var key in config.headers) {
                            if (Object.prototype.hasOwnProperty.call(config.headers, key)) headers[key] = config.headers[key];
                        }
                    }
                    if (!headers['User-Agent'] && !headers['user-agent']) {
                        headers['User-Agent'] = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/138.0.0.0 Safari/537.36';
                    }
                    headers.Referer = refererUrl || sourceUrl;
                    headers.Origin = originOf(headers.Referer) || originOf(config.link || sourceUrl);
                    if (extra) {
                        for (var extraKey in extra) {
                            if (Object.prototype.hasOwnProperty.call(extra, extraKey)) headers[extraKey] = extra[extraKey];
                        }
                    }
                    return headers;
                }

                function requestRule(url, dataType, headers, postBody, done, fail) {
                    var requestConfig = {};
                    for (var key in config) {
                        if (Object.prototype.hasOwnProperty.call(config, key)) requestConfig[key] = config[key];
                    }
                    requestConfig.headers = headers || requestConfig.headers;
                    if (postBody) requestConfig.method = 'POST';
                    if (helpers.buildRuleRequest && helpers.requestRuleNative) {
                        var req = helpers.buildRuleRequest(url, dataType || 'text', requestConfig, {
                            method: postBody ? 'POST' : 'GET',
                            postData: postBody || ''
                        });
                        helpers.requestRuleNative(network, req, done, fail, postBody || false);
                        return;
                    }
                    network.native(url, done, fail, postBody || false, {
                        dataType: dataType || 'text',
                        headers: requestConfig.headers
                    });
                }

                function episodeFromUrl(url) {
                    var text = String(url || '');
                    var m = /\/vodplay\/(\d+)-(\d+)-(\d+)\.html/i.exec(text);
                    if (m) return m[1] + '-' + m[2] + '-' + m[3];
                    m = /[?&]episode=([^&#]+)/i.exec(text);
                    return m && m[1] ? decodeURIComponent(m[1]) : '';
                }

                function extractAssignedObject(source, varName) {
                    source = String(source || '');
                    var re = new RegExp('(?:var|let|const)\\s+' + varName + '\\s*=\\s*', 'i');
                    var m = re.exec(source);
                    if (!m) return '';
                    var start = m.index + m[0].length;
                    while (source.charAt(start) && /\s/.test(source.charAt(start))) start += 1;
                    if (source.charAt(start) !== '{') return '';
                    var depth = 0, inSingle = false, inDouble = false, escaped = false;
                    for (var i = start; i < source.length; i += 1) {
                        var ch = source.charAt(i);
                        if (escaped) { escaped = false; continue; }
                        if (ch === '\\') { escaped = true; continue; }
                        if (inSingle) { if (ch === "'") inSingle = false; continue; }
                        if (inDouble) { if (ch === '"') inDouble = false; continue; }
                        if (ch === "'") { inSingle = true; continue; }
                        if (ch === '"') { inDouble = true; continue; }
                        if (ch === '{') depth += 1;
                        if (ch === '}') {
                            depth -= 1;
                            if (depth === 0) return source.slice(start, i + 1);
                        }
                    }
                    return '';
                }

                function readConFig(html) {
                    var objectText = extractAssignedObject(html, 'ConFig');
                    if (objectText) {
                        try { return JSON.parse(objectText); } catch (e) { }
                    }
                    return {
                        mt: ((String(html || '').match(/"mt"\s*:\s*"([^"]+)"/) || [])[1] || ''),
                        url: ((String(html || '').match(/"url"\s*:\s*"(https?:\\?\/\\?\/[^"\\]+(?:m3u8|mp4)[^"]*)"/) || [])[1] || ''),
                        ad_duration_ms: Number(((String(html || '').match(/"ad_duration_ms"\s*:\s*(\d+)/) || [])[1] || 0))
                    };
                }

                function parseJson(text) {
                    if (typeof text !== 'string') return text || null;
                    try { return JSON.parse(text); } catch (e) { return null; }
                }

                function resolveToken(playerUrl, conf) {
                    var token = conf && conf.mt ? String(conf.mt) : '';
                    if (!token) return onError('huavod: Player/ec 未找到 mt token');
                    var waitMs = Math.max(0, Number(conf.ad_duration_ms || 0) - 1500);
                    setTimeout(function () {
                        var apiUrl = ensureUrl('/Player/resolveUrl', playerUrl);
                        var body = 'token=' + encodeURIComponent(token);
                        var headers = copyHeaders(playerUrl, {
                            'Content-Type': 'application/x-www-form-urlencoded',
                            Accept: 'application/json, text/plain, */*'
                        });
                        requestRule(apiUrl, 'text', headers, body, function (resp) {
                            var payload = parseJson(resp);
                            var finalUrl = payload && payload.data && payload.data.url ? cleanUrl(payload.data.url) : '';
                            finalUrl = ensureUrl(finalUrl, apiUrl);
                            if (isFinalMediaUrl(finalUrl)) return onSuccess(finalUrl);
                            onError('huavod: resolveUrl 未返回播放地址' + (payload && payload.msg ? ' - ' + payload.msg : ''));
                        }, function (a, c) {
                            onError('huavod: 请求 resolveUrl 失败: ' + (network.errorDecode ? network.errorDecode(a, c) : a));
                        });
                    }, waitMs);
                }

                var pageUrl = ensureUrl(sourceUrl, config.link || sourceUrl);
                var episode = episodeFromUrl(pageUrl);
                if (!episode) return onError('huavod: 无法从播放页 URL 提取 episode');
                var playerUrl = ensureUrl('/Player/ec?episode=' + encodeURIComponent(episode), pageUrl);
                requestRule(playerUrl, 'text', copyHeaders(pageUrl), false, function (html) {
                    var conf = readConFig(html);
                    var inlineUrl = conf && conf.url ? ensureUrl(cleanUrl(conf.url), playerUrl) : '';
                    if (isFinalMediaUrl(inlineUrl)) return onSuccess(inlineUrl);
                    resolveToken(playerUrl, conf);
                }, function (a, c) {
                    onError('huavod: 请求 Player/ec 失败: ' + (network.errorDecode ? network.errorDecode(a, c) : a));
                });
            } catch (e) {
                onError('huavod: parser 异常 - ' + (e && e.message ? e.message : e));
            }
        },
        juzong01_cms_json_api_parser: function (sourceUrl, options, onSuccess, onError) {
            options = options || {};
            var network = options.network;
            var config = options.config || {};
            var helpers = options.helpers || {};
            var SITE = "https://www.juzong01.me";
            var PLAYER_ORIGIN = "https://jzpic.ok1333.cn";
            var UA = "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/138.0.0.0 Safari/537.36";

            function fail(message) {
                if (onError) onError("剧踪解析失败：" + message);
            }

            function decodeError(a, c) {
                if (network && typeof network.errorDecode === "function") {
                    return network.errorDecode(a, c);
                }
                return [a, c].filter(Boolean).join(" | ");
            }

            function originOf(url) {
                try {
                    return new URL(url || SITE).origin;
                } catch (e) {
                    return SITE;
                }
            }

            function absoluteUrl(url, baseUrl) {
                var value = String(url || "").trim();
                if (!value) return "";
                if (/^https?:\/\//i.test(value)) return value;
                if (/^\/\//.test(value)) {
                    return (/^http:\/\//i.test(baseUrl || SITE) ? "http:" : "https:") + value;
                }
                try {
                    return new URL(value, baseUrl || config.link || SITE).href;
                } catch (e) {
                    return value;
                }
            }

            function setHeader(headers, name, value) {
                var key;
                var lower = String(name || "").toLowerCase();
                for (key in headers) {
                    if (Object.prototype.hasOwnProperty.call(headers, key) && key.toLowerCase() === lower) {
                        delete headers[key];
                    }
                }
                headers[name] = value;
            }

            function mergeHeaders(extra) {
                var headers = {};
                var key;
                if (config.headers) {
                    for (key in config.headers) {
                        if (Object.prototype.hasOwnProperty.call(config.headers, key)) {
                            setHeader(headers, key, config.headers[key]);
                        }
                    }
                }
                if (extra) {
                    for (key in extra) {
                        if (Object.prototype.hasOwnProperty.call(extra, key)) {
                            setHeader(headers, key, extra[key]);
                        }
                    }
                }
                if (!headers["User-Agent"] && !headers["user-agent"]) setHeader(headers, "User-Agent", UA);
                return headers;
            }

            function buildRequestConfig(headers, forceProxy) {
                var requestConfig = {};
                var key;
                for (key in config) {
                    if (Object.prototype.hasOwnProperty.call(config, key)) requestConfig[key] = config[key];
                }
                requestConfig.headers = headers || {};
                if (forceProxy) {
                    requestConfig.direct = false;
                    requestConfig.use_proxy = true;
                }
                return requestConfig;
            }

            function requestRule(url, dataType, headers, postBody, forceProxy, done, bad) {
                var body = postBody || false;
                if (helpers.buildRuleRequest && helpers.requestRuleNative) {
                    var request = helpers.buildRuleRequest(url, dataType || "text", buildRequestConfig(headers, forceProxy), {
                        method: body ? "POST" : "GET",
                        postData: body || ""
                    });
                    helpers.requestRuleNative(network, request, done, function (a, c) {
                        bad(decodeError(a, c));
                    }, body);
                    return;
                }

                if (!network || !network.native) return bad("缺少请求能力");
                network.native(url, done, function (a, c) {
                    bad(decodeError(a, c));
                }, body, { dataType: dataType || "text", headers: headers || {} });
            }

            function htmlDecode(value) {
                return String(value || "")
                    .replace(/&amp;/g, "&")
                    .replace(/&quot;/g, "\"")
                    .replace(/&#39;|&apos;/g, "'")
                    .replace(/&lt;/g, "<")
                    .replace(/&gt;/g, ">");
            }

            function cleanValue(value) {
                var text = htmlDecode(String(value || ""))
                    .replace(/\\u([0-9a-fA-F]{4})/g, function (_, h) {
                        return String.fromCharCode(parseInt(h, 16));
                    })
                    .replace(/\\\//g, "/")
                    .trim();
                return text;
            }

            function isFinalMediaUrl(url) {
                var value = String(url || "");
                if (!/^https?:\/\//i.test(value)) return false;
                if (/(?:\.m3u8|\.mp4|\.m4s|\.webm|\.mpd)(?:[?#]|$)/i.test(value)) return true;
                if (/\/video\/tos\//i.test(value) || /\/obj\/tos[-_]/i.test(value)) return true;
                if (/\.douyinvod\.com\//i.test(value) && /\/video\/tos\//i.test(value)) return true;
                return false;
            }

            function parseJson(payload) {
                if (payload && typeof payload === "object") return payload;
                try {
                    return JSON.parse(String(payload || ""));
                } catch (e) {
                    return null;
                }
            }

            function escapeRegExp(value) {
                return String(value || "").replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
            }

            function extractAssignedObject(source, varName) {
                var text = String(source || "");
                var assignRe = new RegExp("(?:var|let|const)\\s+" + escapeRegExp(varName) + "\\s*=\\s*", "i");
                var match = assignRe.exec(text);
                var start;
                var depth = 0;
                var inSingle = false;
                var inDouble = false;
                var escaped = false;
                var i;
                var ch;
                if (!match) return "";
                start = match.index + match[0].length;
                while (text.charAt(start) && /\s/.test(text.charAt(start))) start += 1;
                if (text.charAt(start) !== "{") return "";
                for (i = start; i < text.length; i += 1) {
                    ch = text.charAt(i);
                    if (escaped) {
                        escaped = false;
                        continue;
                    }
                    if (ch === "\\") {
                        escaped = true;
                        continue;
                    }
                    if (inSingle) {
                        if (ch === "'") inSingle = false;
                        continue;
                    }
                    if (inDouble) {
                        if (ch === "\"") inDouble = false;
                        continue;
                    }
                    if (ch === "'") {
                        inSingle = true;
                        continue;
                    }
                    if (ch === "\"") {
                        inDouble = true;
                        continue;
                    }
                    if (ch === "{") depth += 1;
                    if (ch === "}") {
                        depth -= 1;
                        if (depth === 0) return text.slice(start, i + 1);
                    }
                }
                return "";
            }

            function readPlayerConfig(html) {
                var objectText = extractAssignedObject(html, "player_data");
                var fallback;
                var match;
                if (objectText) {
                    fallback = parseJson(objectText);
                    if (fallback && fallback.url) return fallback;
                }
                match = /(?:var|let|const)\s+(?:player_[A-Za-z0-9_$]+|player_data)\s*=\s*(\{[\s\S]*?\})\s*(?:<\/script>|;)/i.exec(String(html || ""));
                return match && match[1] ? parseJson(match[1]) : null;
            }

            function extractVar(html, name) {
                var re = new RegExp("\\b" + escapeRegExp(name) + "\\s*=\\s*(['\"])([\\s\\S]*?)\\1", "i");
                var match = re.exec(String(html || ""));
                return match && match[2] ? cleanValue(match[2]) : "";
            }

            function extractEpFromUrl(url) {
                var match = /\/vodplay\/[^\/]+-\d+-(\d+)\//i.exec(String(url || ""));
                return match && match[1] ? match[1] : "1";
            }

            function buildIframeUrl(player, playHtml, playUrl) {
                var videoUrl = cleanValue(player && player.url);
                var videoName = extractVar(playHtml, "vod_name");
                var episodeTitle = extractVar(playHtml, "vod_part");
                var ep = extractEpFromUrl(playUrl);
                var iframeUrl = PLAYER_ORIGIN + "/";
                var params = [];
                function add(key, value) {
                    params.push(encodeURIComponent(key) + "=" + encodeURIComponent(String(value || "")));
                }
                add("url", videoUrl);
                add("name", videoName ? "《" + videoName.replace(/^《|》$/g, "") + "》" : "");
                add("id", "");
                add("ep", ep);
                add("source_index", ep);
                add("episode_title", episodeTitle || ep);
                add("year", "");
                add("type", "电视剧");
                return iframeUrl + "?" + params.join("&");
            }

            function extractParseToken(iframeHtml) {
                var match = /WGART_PARSE_TOKEN\s*=\s*["']([^"']+)["']/i.exec(String(iframeHtml || ""));
                return match && match[1] ? match[1] : "";
            }

            function readApiFinalUrl(payload, apiUrl) {
                var json = parseJson(payload);
                var url = json && json.data && json.data.url ? cleanValue(json.data.url) : "";
                if (!url && json && json.url) url = cleanValue(json.url);
                return url ? absoluteUrl(url, apiUrl) : "";
            }

            function resolveThroughJsonApi(player, playHtml, playUrl) {
                var videoUrl = cleanValue(player && player.url);
                var iframeUrl = buildIframeUrl(player, playHtml, playUrl);
                var iframeHeaders = mergeHeaders({
                    Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
                    Origin: SITE,
                    Referer: playUrl
                });

                if (!videoUrl) return fail("player_data.url 为空");
                requestRule(iframeUrl, "text", iframeHeaders, false, true, function (iframeHtml) {
                    var parseToken = extractParseToken(iframeHtml);
                    var apiUrl;
                    var apiHeaders;
                    if (!parseToken) return fail("未找到 WGART_PARSE_TOKEN");
                    apiUrl = PLAYER_ORIGIN + "/wgart/api.php?action=try_json_api&video_url=" + encodeURIComponent(videoUrl) + "&parse_token=" + encodeURIComponent(parseToken);
                    apiHeaders = mergeHeaders({
                        Accept: "application/json, text/javascript, */*; q=0.01",
                        Origin: PLAYER_ORIGIN,
                        Referer: iframeUrl
                    });
                    requestRule(apiUrl, "json", apiHeaders, false, true, function (apiPayload) {
                        var finalUrl = readApiFinalUrl(apiPayload, apiUrl);
                        if (isFinalMediaUrl(finalUrl)) return onSuccess(finalUrl);
                        fail("try_json_api 未返回可播放链接");
                    }, function (err) {
                        fail("请求 try_json_api 失败: " + err);
                    });
                }, function (err) {
                    fail("请求解析 iframe 失败: " + err);
                });
            }

            var playUrl = absoluteUrl(sourceUrl, config.link || SITE);
            var siteHeaders = mergeHeaders({
                Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
                Origin: originOf(playUrl),
                Referer: config.link || SITE + "/"
            });

            if (!playUrl) return fail("播放页地址为空");
            requestRule(playUrl, "text", siteHeaders, false, false, function (playHtml) {
                var player = readPlayerConfig(playHtml);
                var playerUrl = cleanValue(player && player.url);
                if (isFinalMediaUrl(playerUrl)) return onSuccess(absoluteUrl(playerUrl, playUrl));
                if (!player || !playerUrl) return fail("未找到 player_data.url");
                resolveThroughJsonApi(player, playHtml, playUrl);
            }, function (err) {
                fail("请求播放页失败: " + err);
            });
        },
        vidsrc_real_hls_parser: function (sourceUrl, options, onSuccess, onError) {
            var tmdbKey = "4152ea09a44140809f82d68a9b2b0024";
            var ruleConfig = (options && options.config) || {};
            var videasyF = [
                1116352408, 1899447441, 3049323471, 3921009573,
                961987163, 1508970993, 2453635748, 2870763221,
                3624381080, 310598401, 607225278, 1426881987,
                1925078388, 2162078206, 2614888103, 3248222580
            ];
            var vidfastSite = "https://vidfast.vc";
            var vidfastEncDecApi = "https://enc-dec.app/api";
            var browserUa = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/137.0.0.0 Safari/537.36";
            var vidfastUa = browserUa;
            var vidsrcInSite = "https://vidsrc.in";
            var vidsrcInEmbedHost = "https://vsembed.ru";
            var vidsrcProxyBaseUrls = [
                "https://cf.aston.rocks/"
            ];
            var vidsrcInProxyBaseUrls = [
                "https://stnh70-ap.hf.space/",
                "https://cf.aston.rocks/"
            ];

            function getRuntimeConfigSources() {
                return [
                    ruleConfig,
                    ruleConfig.config,
                    ruleConfig.full_button,
                    ruleConfig.full_button && ruleConfig.full_button.config,
                    ruleConfig.__web5_full_button,
                    ruleConfig.__web5_full_button && ruleConfig.__web5_full_button.config,
                    options,
                    options && options.config,
                    options && options.full_button,
                    options && options.full_button && options.full_button.config,
                    options && options.__web5_full_button,
                    options && options.__web5_full_button && options.__web5_full_button.config
                ];
            }

            function readProviderOption(source, providerName, optionName) {
                var providerConfigs;
                var providerConfig;
                var configuredSources;
                var normalizedProvider;
                var sourceItem;
                var i;

                if (!source || typeof source !== "object") return undefined;

                configuredSources = source.sources;
                if (Array.isArray(configuredSources)) {
                    normalizedProvider = normalizeProviderKey(providerName);
                    for (i = 0; i < configuredSources.length; i += 1) {
                        sourceItem = configuredSources[i];
                        if (!sourceItem || typeof sourceItem !== "object") continue;
                        if (normalizeProviderKey(sourceItem.id || sourceItem.provider || sourceItem.source) !== normalizedProvider) continue;

                        if (Object.prototype.hasOwnProperty.call(sourceItem, optionName)) return sourceItem[optionName];
                        if ((optionName === "url" || optionName === "endpoint") &&
                            Object.prototype.hasOwnProperty.call(sourceItem, "api_url")) {
                            return sourceItem.api_url;
                        }
                    }
                }

                providerConfigs = source.provider_configs || source.playback_provider_configs || source.providers || source.playback_providers || {};
                providerConfig = providerConfigs && providerConfigs[providerName];
                if (providerConfig && typeof providerConfig === "object" && Object.prototype.hasOwnProperty.call(providerConfig, optionName)) {
                    return providerConfig[optionName];
                }

                return undefined;
            }

            function readRuntimeSetting(settingName, providerName, providerOptionName) {
                var sources = getRuntimeConfigSources();
                var value;
                var i;

                for (i = 0; i < sources.length; i++) {
                    if (!sources[i] || typeof sources[i] !== "object") continue;
                    if (Object.prototype.hasOwnProperty.call(sources[i], settingName)) return sources[i][settingName];
                    if (providerName && providerOptionName) {
                        value = readProviderOption(sources[i], providerName, providerOptionName);
                        if (value !== undefined) return value;
                    }
                }

                return undefined;
            }

            function readRuntimeString(settingName, providerName, providerOptionName, defaultValue) {
                var value = readRuntimeSetting(settingName, providerName, providerOptionName);
                if (value === undefined || value === null) return defaultValue || "";
                if (typeof value === "boolean") return value ? String(defaultValue || "") : "";
                return String(value).trim();
            }

            function readFlag(value) {
                var text;
                if (typeof value === "boolean") return value;
                if (typeof value === "number") return value !== 0;
                if (typeof value !== "string") return undefined;
                text = value.trim().toLowerCase();
                if (!text) return undefined;
                if (/^(0|false|no|off|null|undefined)$/i.test(text)) return false;
                if (/^(1|true|yes|on)$/i.test(text)) return true;
                return undefined;
            }

            function getPlaybackProxySegmentsOverride(providerName) {
                var value = readRuntimeSetting("playback_proxy_segments", providerName, "proxy_segments");
                return readFlag(value);
            }

            function getPlaybackSegmentProxyBase(providerName) {
                var value = readRuntimeString("playback_segment_proxy_base", providerName, "segment_proxy_base", "") ||
                    readRuntimeString("segment_proxy_base", providerName, "segment_proxy_base", "");
                return value ? normalizeProxyBase(value) : "";
            }

            function addPlaybackProxyRoutingParams(params, providerName) {
                var override = getPlaybackProxySegmentsOverride(providerName);
                var proxyBase = getPlaybackSegmentProxyBase(providerName);

                if (providerName === "vidfast_real_api") {
                    params.playback_proxy_segments = "1";
                    return params;
                }
                if (override !== undefined) params.playback_proxy_segments = override ? "1" : "0";
                if (proxyBase) params.playback_segment_proxy_base = proxyBase;
                return params;
            }

            function readProviderSetting(source, providerName) {
                var providerConfigs;
                var scopedKey = providerName + "_available";
                var value;

                if (!source || typeof source !== "object") return undefined;

                value = readFlag(source[providerName]);
                if (value !== undefined) return value;
                value = readFlag(source[scopedKey]);
                if (value !== undefined) return value;

                providerConfigs = source.provider_configs || source.playback_provider_configs || source.providers || source.playback_providers || {};
                value = readFlag(providerConfigs && providerConfigs[providerName]);
                if (value !== undefined) return value;
                value = readFlag(providerConfigs && providerConfigs[providerName] && providerConfigs[providerName].available);
                if (value !== undefined) return value;

                return undefined;
            }

            function isProviderEnabled(providerName, defaultValue, urlOverride) {
                var sources = [
                    ruleConfig,
                    ruleConfig.config,
                    ruleConfig.full_button,
                    ruleConfig.full_button && ruleConfig.full_button.config,
                    ruleConfig.__web5_full_button,
                    ruleConfig.__web5_full_button && ruleConfig.__web5_full_button.config,
                    options,
                    options && options.config,
                    options && options.full_button,
                    options && options.full_button && options.full_button.config,
                    options && options.__web5_full_button,
                    options && options.__web5_full_button && options.__web5_full_button.config
                ];
                var providerDefaults = {
                    videasy_real: true,
                    videasy_real_api: false,
                    vidfast_real_api: false,
                    vidfast_real: false,
                    vidsrc_in_real: false,
                    vsembed_real_api: false,
                    cinesrc_real_api: false
                };
                var value;
                var i;
                var configuredSources = getConfiguredProviderSources();

                if (configuredSources !== null) {
                    var configuredSource = getConfiguredProviderSource(providerName);
                    return !!(configuredSource && configuredSource.enable);
                }

                for (i = 0; i < sources.length; i++) {
                    value = readProviderSetting(sources[i], providerName);
                    if (value !== undefined) return value;
                }
                if (typeof urlOverride === "boolean") return urlOverride;
                if (typeof providerDefaults[providerName] === "boolean") return providerDefaults[providerName];
                return defaultValue;
            }

            function isPlayableMediaUrl(url) {
                return /\.m3u8(?:[?#]|$)|\.mp4(?:[?#]|$)|\.mpd(?:[?#]|$)|\/(?:play|proxy)\?(?:[^#]*&)?url=/i.test(String(url || ""));
            }

            function normalizeErrorMessage(reason) {
                var status;
                var detail;

                if (typeof reason === "string") return reason;
                if (reason && reason.responseJSON) {
                    if (typeof reason.responseJSON === "string") return reason.responseJSON;
                    if (reason.responseJSON.message) return String(reason.responseJSON.message);
                    if (reason.responseJSON.msg) return String(reason.responseJSON.msg);
                    if (reason.responseJSON.text) return String(reason.responseJSON.text);
                    if (reason.responseJSON.error) return String(reason.responseJSON.error);
                }
                if (reason && reason.responseText) return String(reason.responseText);
                if (reason && (reason.status !== undefined || reason.statusCode !== undefined || reason.code !== undefined)) {
                    status = String(reason.status !== undefined ? reason.status : (reason.statusCode !== undefined ? reason.statusCode : reason.code));
                    detail = reason.statusText || reason.message || reason.msg || (reason.error && typeof reason.error !== "object" ? reason.error : "");
                    return "VidSrc: 请求失败 (" + status + (detail ? " " + String(detail) : "") + ")";
                }
                if (reason && reason.message) return String(reason.message);
                if (reason && reason.msg) return String(reason.msg);
                if (reason && reason.statusText) return String(reason.statusText);
                if (reason && reason.error && typeof reason.error !== "object") return String(reason.error);
                if (reason && typeof reason === "object") {
                    try {
                        return "VidSrc: 请求失败 " + JSON.stringify(reason);
                    } catch (e) { }
                }
                return "VidSrc: 未知错误";
            }

            function buildVideasySourceError(sourceName, reason) {
                var detail = normalizeErrorMessage(reason).replace(/^VidSrc:\s*/i, "");
                return "VidSrc: " + sourceName + " 线路没有可播放数据" + (detail ? "（" + detail + "）" : "");
            }

            function addPlaybackProxy(url, sourceName) {
                var text = String(url || "");
                var source = String(sourceName || "").toLowerCase();
                var host = getUrlHost(text);
                var sendheader = "https://cf.aston.rocks/param/referer=" + encodeURIComponent("https://moon.peakstorm.top/") + "/direct/";
                var sendheader_ = "https://cf.aston.rocks/param/referer=" + encodeURIComponent("https://moon.peakstorm.top/") + "/";

                // API providers may already return a finalized playback proxy URL.
                if (
                    !text ||
                    /^https:\/\/cf\.aston\.rocks\//i.test(text) ||
                    /\/(?:play|proxy)\?(?:[^#]*&)?(?:url|target)=/i.test(text) ||
                    /\/param\/(?:referer|origin)=/i.test(text)
                ) return text;
                if (source === "m4uhd" || source === "lamovie") return text;
                if (host === "sun.peakstorm.top" || host === "moon.peakstorm.top") return sendheader + text;
                if (source === "cdn") return sendheader_ + text;
                return text;
            }

            function getUrlHost(url) {
                var match = String(url || "").match(/^https?:\/\/([^/?#]+)/i);
                return match ? String(match[1]).toLowerCase() : "";
            }

            function extractMediaInfo(url) {
                var text = String(url || "");
                if (isVidsrcDetailEntryUrl(text)) return null;

                var tvMatch = text.match(/vidsrc:\/\/tv\/(\d+)\/(\d+)\/(\d+)/i) || text.match(/\/tv\/(\d+)\/(\d+)\/(\d+)/i);
                var movieMatch = text.match(/\/movie\/(\d+)/i) || text.match(/vidsrc:\/\/movie\/(\d+)/i);
                var query = parseQuery(text);

                if (tvMatch) {
                    return {
                        type: "tv",
                        id: tvMatch[1],
                        season: tvMatch[2],
                        episode: tvMatch[3]
                    };
                }

                return {
                    type: query.media_type || query.type || "movie",
                    id: movieMatch ? movieMatch[1] : (query.tmdb_id || ""),
                    season: query.season || "1",
                    episode: query.episode || "1"
                };
            }

            function isVidsrcDetailEntryUrl(url) {
                return /vidsrc:\/\/detail\/(?:tv|movie)\/\d+/i.test(String(url || ""));
            }

            function parseVidsrcPlayUrl(url) {
                var query = parseQuery(url);
                var media = extractMediaInfo(url);
                if (!media) return null;

                return {
                    type: media.type,
                    id: media.id,
                    season: media.season || query.season || "1",
                    episode: media.episode || query.episode || "1",
                    provider: query.provider || "vidsrc_in_real",
                    source: query.source || "auto",
                    title: query.title || "",
                    year: query.year || "",
                    imdbId: query.imdb_id || query.imdbId || "",
                    totalSeasons: query.total_seasons || query.totalSeasons || "",
                    episodeFilter: query.episode_filter || query.episodeFilter || "",
                    vidfastReal: isTruthyFlag(query.vidfast_real || query.vidfastReal) || isProviderEnabled("vidfast_real", false),
                    vidfastRealApi: isTruthyFlag(query.vidfast_real_api || query.vidfastRealApi || query.vidfast_api || query.vidfastApi) || isProviderEnabled("vidfast_real_api", false),
                    vidsrcInReal: isTruthyFlag(query.vidsrc_in_real || query.vidsrcInReal || query.vidsrc_in || query.vidsrcIn) || isProviderEnabled("vidsrc_in_real", false),
                    vsembedRealApi: isTruthyFlag(query.vsembed_real_api || query.vsembedRealApi || query.vsembed_api || query.vsembedApi) || isProviderEnabled("vsembed_real_api", false),
                    cinesrcRealApi: isTruthyFlag(query.cinesrc_real_api || query.cinesrcRealApi || query.cinesrc_api || query.cinesrcApi) || isProviderEnabled("cinesrc_real_api", false)
                };
            }

            function parseQuery(url) {
                var text = String(url || "");
                var query = {};
                var queryPart = text.split("?")[1] || "";

                queryPart.split("&").forEach(function (pair) {
                    if (!pair) return;
                    var bits = pair.split("=");
                    var key = safeDecodeURIComponent(bits[0] || "");
                    if (!key) return;
                    query[key] = safeDecodeURIComponent(bits.slice(1).join("=") || "");
                });

                return query;
            }

            function safeDecodeURIComponent(value) {
                try {
                    return decodeURIComponent(String(value || "").replace(/\+/g, "%20"));
                } catch (e) {
                    return String(value || "");
                }
            }

            function isTruthyFlag(value) {
                var text = String(value === undefined || value === null ? "" : value).trim().toLowerCase();
                if (!text) return false;
                return !(/^(0|false|no|off|null|undefined)$/i.test(text));
            }

            function clonePlay(play) {
                var copy = {};
                Object.keys(play || {}).forEach(function (key) {
                    copy[key] = play[key];
                });
                return copy;
            }

            function normalizeProviderKey(provider) {
                var key = String(provider || "").toLowerCase();
                var aliases = {
                    auto: "auto",
                    videasy: "videasy_real",
                    videasy_real: "videasy_real",
                    videasy_api: "videasy_real_api",
                    videasy_real_api: "videasy_real_api",
                    vidfast_api: "vidfast_real_api",
                    vidfast_real_api: "vidfast_real_api",
                    vidfast: "vidfast_real",
                    vidfast_real: "vidfast_real",
                    vidlink: "vidlink_real_api",
                    vidlink_api: "vidlink_real_api",
                    vidlink_real_api: "vidlink_real_api",
                    vidlinkrealapi: "vidlink_real_api",
                    vidlinkreal_api: "vidlink_real_api",
                    vidsrcin: "vidsrc_in_real",
                    vidsrc_in: "vidsrc_in_real",
                    vidsrc_in_real: "vidsrc_in_real",
                    vidsrcinreal: "vidsrc_in_real",
                    vidsrcin_real: "vidsrc_in_real",
                    vsembed: "vsembed_real_api",
                    vsembed_api: "vsembed_real_api",
                    vsembed_real_api: "vsembed_real_api",
                    cinesrc: "cinesrc_real_api",
                    cinesrcapi: "cinesrc_real_api",
                    cinesrc_api: "cinesrc_real_api",
                    cinesrcrealapi: "cinesrc_real_api",
                    cinesrc_real_api: "cinesrc_real_api"
                };
                return aliases[key] || key;
            }

            function normalizeConfiguredSource(source) {
                var id;
                var enable;
                var tvSeriesEnable;
                var supportedProviders = {
                    videasy_real: true,
                    videasy_real_api: true,
                    vidlink_real_api: true,
                    vidfast_real_api: true,
                    vidfast_real: true,
                    vidsrc_in_real: true,
                    vsembed_real_api: true,
                    cinesrc_real_api: true
                };

                if (!source || typeof source !== "object") return null;

                id = normalizeProviderKey(source.id || source.provider || source.source);
                if (!id || id === "auto" || !supportedProviders[id]) return null;

                enable = readFlag(source.enable);
                if (enable === undefined) enable = true;

                tvSeriesEnable = readFlag(source.tv_series_enable);
                if (tvSeriesEnable === undefined) tvSeriesEnable = readFlag(source.tvSeriesEnable);
                if (tvSeriesEnable === undefined) tvSeriesEnable = false;

                return {
                    id: id,
                    enable: enable,
                    tvSeriesEnable: tvSeriesEnable,
                    raw: source
                };
            }

            function normalizeProviderHlsType(value) {
                var type = String(value || "").trim().toLowerCase();

                return type === "native" || type === "hlsjs" ? type : "";
            }

            function getConfiguredProviderSources() {
                var runtimeSources = getRuntimeConfigSources();
                var configured;
                var result;
                var seen;
                var i;

                for (i = 0; i < runtimeSources.length; i += 1) {
                    if (!runtimeSources[i] || typeof runtimeSources[i] !== "object") continue;
                    if (!Object.prototype.hasOwnProperty.call(runtimeSources[i], "sources")) continue;

                    configured = runtimeSources[i].sources;
                    if (!Array.isArray(configured)) return [];

                    result = [];
                    seen = {};
                    configured.forEach(function (source) {
                        var normalized = normalizeConfiguredSource(source);
                        if (!normalized || seen[normalized.id]) return;
                        seen[normalized.id] = true;
                        result.push(normalized);
                    });
                    return result;
                }

                return null;
            }

            function getConfiguredProviderSource(providerName) {
                var configured = getConfiguredProviderSources();
                var key = normalizeProviderKey(providerName);
                var i;

                if (configured === null) return null;

                for (i = 0; i < configured.length; i += 1) {
                    if (configured[i].id === key) return configured[i];
                }

                return null;
            }

            function getConfiguredProviderHlsType(providerName) {
                var configured = getConfiguredProviderSource(providerName);
                var raw = configured && configured.raw;

                return normalizeProviderHlsType(raw && raw.hls_type);
            }

            function getConfiguredProviderEntries(mediaType) {
                var configured = getConfiguredProviderSources();

                if (configured === null) return null;

                return configured.filter(function (source) {
                    if (!source.enable) return false;
                    if (mediaType === "tv" && !source.tvSeriesEnable) return false;
                    return true;
                });
            }

            function getProviderConfigs(play) {
                return {
                    videasy_real: {
                        available: isProviderEnabled("videasy_real", true),
                        resolver: resolveVideasyRealMedia,
                        autoOrder: 10
                    },
                    videasy_real_api: {
                        available: isProviderEnabled("videasy_real_api", false, play && play.videasyRealApi),
                        resolver: resolveVideasyRealApiMedia,
                        autoOrder: 5
                    },
                    vidlink_real_api: {
                        available: isProviderEnabled("vidlink_real_api", false, play && play.vidlinkRealApi),
                        resolver: resolveVidlinkRealApiMedia,
                        autoOrder: 12
                    },
                    vidfast_real_api: {
                        available: isProviderEnabled("vidfast_real_api", false, play && play.vidfastRealApi),
                        resolver: resolveVidfastRealApiMedia,
                        autoOrder: 15
                    },
                    vidfast_real: {
                        available: isProviderEnabled("vidfast_real", false, play && play.vidfastReal),
                        resolver: resolveVidfastRealMedia,
                        autoOrder: 20
                    },
                    vidsrc_in_real: {
                        available: isProviderEnabled("vidsrc_in_real", false, play && play.vidsrcInReal),
                        resolver: resolveVidsrcInRealMedia,
                        autoOrder: 0
                    },
                    vsembed_real_api: {
                        available: isProviderEnabled("vsembed_real_api", false, play && play.vsembedRealApi),
                        resolver: resolveVsembedRealApiMedia,
                        autoOrder: 2
                    },
                    cinesrc_real_api: {
                        available: isProviderEnabled("cinesrc_real_api", false, play && play.cinesrcRealApi),
                        resolver: resolveCinesrcRealApiMedia,
                        autoOrder: 30
                    }
                };
            }

            function getProviderConfig(provider, play) {
                return getProviderConfigs(play)[normalizeProviderKey(provider)] || null;
            }

            function isProviderAvailable(provider, play) {
                var config = getProviderConfig(provider, play);
                var configuredSource = getConfiguredProviderSource(provider);

                if (configuredSource && play && play.type === "tv" && !configuredSource.tvSeriesEnable) return false;
                return !!(config && config.available);
            }

            function getProviderResolver(provider, play) {
                var config = getProviderConfig(provider, play);
                if (!config || !config.available) return null;
                return config.resolver || null;
            }

            function wrapProviderSuccess(providerName, play, success) {
                return function (stream, metadata) {
                    var url = stream;
                    var result = {};
                    var configuredHlsType;
                    var key;

                    if (stream && typeof stream === "object") {
                        url = stream.url || stream.file || stream.src || stream.playlist || "";
                        for (key in stream) {
                            if (Object.prototype.hasOwnProperty.call(stream, key) && key !== "url") {
                                result[key] = stream[key];
                            }
                        }
                    }

                    if (metadata && typeof metadata === "object") {
                        for (key in metadata) {
                            if (Object.prototype.hasOwnProperty.call(metadata, key)) {
                                result[key] = metadata[key];
                            }
                        }
                    }

                    result.provider = result.provider || normalizeProviderKey(providerName);
                    configuredHlsType = getConfiguredProviderHlsType(providerName);
                    result.hls_type = normalizeProviderHlsType(result.hls_type) ||
                        configuredHlsType ||
                        "";

                    success(url, result);
                };
            }

            function getAutoProviderOrder(play) {
                var configured = getConfiguredProviderEntries(play && play.type === "tv" ? "tv" : "movie");
                var configs = getProviderConfigs(play);

                if (configured !== null) {
                    return configured.filter(function (source) {
                        return configs[source.id] && configs[source.id].available;
                    }).map(function (source) {
                        return source.id;
                    });
                }

                return Object.keys(configs).filter(function (provider) {
                    return configs[provider] && configs[provider].available;
                }).sort(function (a, b) {
                    return Number(configs[a].autoOrder || 0) - Number(configs[b].autoOrder || 0);
                });
            }

            function resolveProviderMedia(play, parserOptions, success, fail) {
                var resolver;
                var providerName;
                play.provider = normalizeProviderKey(play.provider);

                if (play.provider === "auto") return resolveAutoProviderMedia(play, parserOptions, success, fail);

                if (!isProviderAvailable(play.provider, play)) return fail("VidSrc: provider disabled: " + play.provider);

                resolver = getProviderResolver(play.provider, play);
                if (!resolver) return fail("VidSrc: unsupported provider: " + play.provider);
                providerName = play.provider;
                return resolver(play, parserOptions, wrapProviderSuccess(providerName, play, success), fail);
            }

            function resolveAutoProviderMedia(play, parserOptions, success, fail) {
                var order = getAutoProviderOrder(play);

                function next(index, lastError) {
                    var provider;
                    var resolver;
                    var candidate;

                    if (index >= order.length) return fail(lastError || "VidSrc: no provider returned a playable media URL.");

                    provider = order[index];
                    resolver = getProviderResolver(provider, play);
                    if (!resolver) return next(index + 1, lastError);

                    candidate = clonePlay(play);
                    candidate.provider = provider;
                    candidate.source = "auto";

                    resolveProviderMedia(candidate, parserOptions, success, function (reason) {
                        next(index + 1, normalizeErrorMessage(reason));
                    });
                }

                next(0, "");
            }

            function resolveVideasyRealMedia(play, parserOptions, success, fail) {
                var sourceOrder = play.source === "auto"
                    ? ["m4uhd", "lamovie", "cdn", "vsrc", "downloader2", "superflix", "hdmovie"]
                    : [play.source];

                fetchTmdbMeta(play, parserOptions, function (meta) {
                    fetchVideasySeed(play.id, parserOptions, function (seed) {
                        tryVideasySource(0, sourceOrder, play, seed, meta, parserOptions, success, fail);
                    }, fail);
                }, fail);
            }

            function resolveVideasyRealApiMedia(play, parserOptions, success, fail) {
                var baseUrl = getVideasyRealApiBaseUrl(parserOptions);
                var url;

                if (!baseUrl) return fail("VidSrc: videasy_real_api_url is missing.");

                url = buildVideasyRealApiUrl(baseUrl, play);
                requestProviderCandidateByType({
                    url: url,
                    headers: {
                        Accept: "application/json, text/plain, */*"
                    }
                }, "json", parserOptions, function (data) {
                    var result = data;
                    var streams;
                    var selectedSource;

                    if (typeof result === "string") {
                        try {
                            result = JSON.parse(result);
                        } catch (e) {
                            return fail("VidSrc: Videasy API returned invalid JSON.");
                        }
                    }

                    if (result && result.ok === false) {
                        return fail("VidSrc: " + (result.error || result.message || "Videasy API failed."));
                    }

                    streams = normalizeVideasyApiStreams(result);
                    if (!streams.length) return fail("VidSrc: Videasy API returned empty streams.");

                    selectedSource = String((result && (result.selectedSource || result.source)) || play.source || "auto").trim() || "auto";
                    success(addPlaybackProxy(streams[0].url, selectedSource));
                }, function (error, exception) {
                    fail(normalizeErrorMessage(error || exception) || "VidSrc: Videasy API request failed.");
                });
            }

            function getVidlinkRealApiBaseUrl(parserOptions) {
                var baseUrl = readRuntimeString("vidlink_real_api_url", "vidlink_real_api", "url", "") ||
                    readRuntimeString("vidlink_real_api_endpoint", "vidlink_real_api", "endpoint", "") ||
                    readRuntimeString("vidlink_api_url", "vidlink_real_api", "api_url", "");

                if (!/^https?:\/\//i.test(baseUrl)) return "";
                return normalizeProxyBase(baseUrl);
            }

            function buildVidlinkRealApiUrl(baseUrl, play) {
                var params = {
                    tmdbId: play.id,
                    mediaType: play.type === "tv" ? "tv" : "movie",
                    season: play.season || "1",
                    episode: play.episode || "1",
                    source: play.source || "auto",
                    title: play.title || "",
                    year: play.year || "",
                    imdbId: play.imdbId || "",
                    totalSeasons: play.totalSeasons || ""
                };
                var query = toQueryString(addPlaybackProxyRoutingParams(params, "vidlink_real_api"));
                var cleanBase = String(baseUrl || "").replace(/\/+$/, "");

                if (/\/vidlink\/resolve(?:[?#]|$)/i.test(cleanBase)) {
                    return cleanBase + (cleanBase.indexOf("?") > -1 ? "&" : "?") + query;
                }

                return cleanBase + "/vidlink/resolve?" + query;
            }

            function normalizeVidlinkApiStreams(data) {
                var list = [];
                var seen = {};

                function formatQualityLabel(value) {
                    var text = String(value || "").trim().toLowerCase();
                    var match;

                    if (!text || text === "auto" || text === "unknown") return "Auto";
                    if (/^4k$|^2160p?$/.test(text)) return "4K";
                    match = text.match(/^(\d{3,4})(?:p)?$/i);
                    if (match) return match[1] + "p";
                    return String(value || "");
                }

                function add(item, fallbackQuality) {
                    var url = String((item && (item.url || item.file || item.src || item.playlist)) || "").trim();
                    var rawQuality = String((item && (item.quality || item.label || item.name)) || fallbackQuality || "auto");
                    var quality = formatQualityLabel(rawQuality);

                    if (!isPlayableMediaUrl(url) || seen[url]) return;
                    seen[url] = true;
                    list.push({
                        url: url,
                        quality: quality,
                        title: quality,
                        source: item && item.source ? item.source : ""
                    });
                }

                if (data && data.stream && data.stream.qualities && typeof data.stream.qualities === "object") {
                    Object.keys(data.stream.qualities).forEach(function (qualityKey) {
                        add({
                            url: data.stream.qualities[qualityKey] && data.stream.qualities[qualityKey].url,
                            quality: qualityKey,
                            source: qualityKey
                        }, qualityKey);
                    });
                }

                if (data && isPlayableMediaUrl(data.playlist || "")) {
                    add({ url: data.playlist, quality: "auto", source: data.source || "" }, "auto");
                }

                if (data && isPlayableMediaUrl(data.url || "")) {
                    add({ url: data.url, quality: "auto", source: data.source || "" }, "auto");
                }

                if (data && Array.isArray(data.sources)) data.sources.forEach(function (item) { add(item); });
                if (data && Array.isArray(data.streams)) data.streams.forEach(function (item) { add(item); });
                if (Array.isArray(data)) data.forEach(function (item) { add(item); });

                list.sort(function (a, b) {
                    return qualityScore(b) - qualityScore(a);
                });

                return list;
            }

            function applyVidlinkApiSubtitles(result, parserOptions) {
                var captions = result && (result.subtitles || result.captions || result.default_subs || result.defaultSubs) || [];
                var subtitles = normalizeVidsrcInStreamSubtitles(captions, "https://vidlink.pro/");
                var element = parserOptions && parserOptions.helpers && parserOptions.helpers.element;

                if (!subtitles.length) {
                    if (result && typeof result === "object") {
                        delete result.subtitles;
                        delete result.captions;
                    }
                    if (element && typeof element === "object") delete element.subtitles;
                    return subtitles;
                }

                if (result && typeof result === "object") {
                    result.subtitles = subtitles;
                    result.captions = subtitles;
                }

                if (element && typeof element === "object") {
                    if (Array.isArray(element.subtitles)) {
                        element.subtitles.length = 0;
                        subtitles.forEach(function (item) {
                            element.subtitles.push(item);
                        });
                    } else {
                        element.subtitles = subtitles;
                    }
                }

                return subtitles;
            }

            function resolveVidlinkRealApiMedia(play, parserOptions, success, fail) {
                var baseUrl = getVidlinkRealApiBaseUrl(parserOptions);
                var url;

                if (!baseUrl) return fail("VidSrc: vidlink_real_api_url is missing.");

                url = buildVidlinkRealApiUrl(baseUrl, play);
                requestProviderCandidateByType({
                    url: url,
                    headers: {
                        Accept: "application/json, text/plain, */*"
                    }
                }, "json", parserOptions, function (data) {
                    var result = data;
                    var streams;
                    var selectedSource;

                    if (typeof result === "string") {
                        try {
                            result = JSON.parse(result);
                        } catch (e) {
                            return fail("VidSrc: VidLink API returned invalid JSON.");
                        }
                    }

                    if (result && result.ok === false) {
                        return fail("VidSrc: " + (result.error || result.message || "VidLink API failed."));
                    }

                    streams = normalizeVidlinkApiStreams(result);
                    if (!streams.length) return fail("VidSrc: VidLink API returned empty streams.");

                    applyVidlinkApiSubtitles(result, parserOptions);

                    selectedSource = String((result && (result.selectedSource || result.source)) || play.source || "auto").trim() || "auto";
                    success(addPlaybackProxy(streams[0].url, selectedSource));
                }, function (error, exception) {
                    fail(normalizeErrorMessage(error || exception) || "VidSrc: VidLink API request failed.");
                });
            }

            function applyVsembedApiSubtitles(result, parserOptions) {
                var captions = result && (result.subtitles || result.captions || result.default_subs || result.defaultSubs) || [];
                var subtitles = normalizeVidsrcInStreamSubtitles(captions, "");
                var element = parserOptions && parserOptions.helpers && parserOptions.helpers.element;

                if (!subtitles.length) {
                    if (result && typeof result === "object") {
                        delete result.subtitles;
                        delete result.captions;
                    }
                    if (element && typeof element === "object") delete element.subtitles;
                    return subtitles;
                }

                if (result && typeof result === "object") {
                    result.subtitles = subtitles;
                    result.captions = subtitles;
                }

                if (element && typeof element === "object") {
                    if (Array.isArray(element.subtitles)) {
                        element.subtitles.length = 0;
                        subtitles.forEach(function (item) {
                            element.subtitles.push(item);
                        });
                    } else {
                        element.subtitles = subtitles;
                    }
                }

                return subtitles;
            }

            function getVsembedRealApiBaseUrl(parserOptions) {
                var baseUrl = readRuntimeString("vsembed_real_api_url", "vsembed_real_api", "url", "") ||
                    readRuntimeString("vsembed_real_api_endpoint", "vsembed_real_api", "endpoint", "") ||
                    readRuntimeString("vsembed_api_url", "vsembed_real_api", "api_url", "");

                if (!/^https?:\/\//i.test(baseUrl)) return "";
                return normalizeProxyBase(baseUrl);
            }

            function buildVsembedRealApiUrl(baseUrl, play) {
                var params = {
                    tmdbId: play.id,
                    mediaType: play.type === "tv" ? "tv" : "movie",
                    season: play.season || "1",
                    episode: play.episode || "1",
                    source: play.source || "auto",
                    title: play.title || "",
                    year: play.year || "",
                    imdbId: play.imdbId || "",
                    totalSeasons: play.totalSeasons || ""
                };
                var query = toQueryString(params);
                var cleanBase = String(baseUrl || "").replace(/\/+$/, "");

                if (/\/vsembed\/resolve(?:[?#]|$)/i.test(cleanBase)) {
                    return cleanBase + (cleanBase.indexOf("?") > -1 ? "&" : "?") + query;
                }

                return cleanBase + "/vsembed/resolve?" + query;
            }

            function normalizeVsembedApiStreams(data) {
                return normalizeVidlinkApiStreams(data);
            }

            function resolveVsembedRealApiMedia(play, parserOptions, success, fail) {
                var baseUrl = getVsembedRealApiBaseUrl(parserOptions);
                var url;

                if (!baseUrl) return fail("VidSrc: vsembed_real_api_url is missing.");

                url = buildVsembedRealApiUrl(baseUrl, play);
                requestProviderCandidateByType({
                    url: url,
                    headers: {
                        Accept: "application/json, text/plain, */*"
                    }
                }, "json", parserOptions, function (data) {
                    var result = data;
                    var streams;
                    var selectedSource;

                    if (typeof result === "string") {
                        try {
                            result = JSON.parse(result);
                        } catch (e) {
                            return fail("VidSrc: VSEmbed API returned invalid JSON.");
                        }
                    }

                    if (result && result.ok === false) {
                        return fail("VidSrc: " + (result.error || result.message || "VSEmbed API failed."));
                    }

                    streams = normalizeVsembedApiStreams(result);
                    if (!streams.length) return fail("VidSrc: VSEmbed API returned empty streams.");

                    applyVsembedApiSubtitles(result, parserOptions);
                    selectedSource = String((result && (result.selectedSource || result.source)) || play.source || "auto").trim() || "auto";
                    success(addPlaybackProxy(streams[0].url, selectedSource));
                }, function (error, exception) {
                    fail(normalizeErrorMessage(error || exception) || "VidSrc: VSEmbed API request failed.");
                });
            }

            function getVideasyRealApiBaseUrl(parserOptions) {
                var baseUrl = readRuntimeString("videasy_real_api_url", "videasy_real_api", "url", "") ||
                    readRuntimeString("videasy_real_api_endpoint", "videasy_real_api", "endpoint", "") ||
                    readRuntimeString("videasy_api_url", "videasy_real_api", "api_url", "");

                if (!baseUrl) baseUrl = "https://proxy.aston.rocks/";
                if (!/^https?:\/\//i.test(baseUrl)) return "";
                return normalizeProxyBase(baseUrl);
            }

            function buildVideasyRealApiUrl(baseUrl, play) {
                var params = {
                    tmdbId: play.id,
                    mediaType: play.type === "tv" ? "tv" : "movie",
                    season: play.season || "1",
                    episode: play.episode || "1",
                    source: play.source || "auto",
                    title: play.title || "",
                    year: play.year || "",
                    imdbId: play.imdbId || "",
                    totalSeasons: play.totalSeasons || ""
                };
                var query = toQueryString(addPlaybackProxyRoutingParams(params, "videasy_real_api"));
                var cleanBase = String(baseUrl || "").replace(/\/+$/, "");

                if (/\/videasy\/resolve(?:[?#]|$)/i.test(cleanBase)) {
                    return cleanBase + (cleanBase.indexOf("?") > -1 ? "&" : "?") + query;
                }

                return cleanBase + "/videasy/resolve?" + query;
            }

            function normalizeVideasyApiStreams(data) {
                var list = [];
                var seen = {};

                function add(item) {
                    var url = String((item && (item.url || item.file || item.src || item.playlist)) || "").trim();
                    var quality = String((item && (item.quality || item.label || item.name)) || "auto");

                    if (!isPlayableMediaUrl(url) || seen[url]) return;
                    seen[url] = true;
                    list.push({
                        url: url,
                        quality: quality,
                        title: quality,
                        source: item && item.source ? item.source : ""
                    });
                }

                if (data && isPlayableMediaUrl(data.playlist || "")) {
                    add({ url: data.playlist, quality: "auto", source: data.source || "" });
                }

                if (data && Array.isArray(data.streams)) {
                    data.streams.forEach(add);
                }

                list.sort(function (a, b) {
                    return qualityScore(b) - qualityScore(a);
                });

                return list;
            }

            function fetchTmdbMeta(play, parserOptions, done, fail) {
                if (play.title && play.year && (play.type === "tv" || play.imdbId)) {
                    return done({
                        title: play.title,
                        year: play.year,
                        imdbId: play.imdbId,
                        totalSeasons: play.totalSeasons
                    });
                }

                var tmdbType = play.type === "tv" ? "tv" : "movie";
                var url = "https://api.themoviedb.org/3/" + tmdbType + "/" + encodeURIComponent(play.id) +
                    "?api_key=" + tmdbKey +
                    "&language=zh&append_to_response=external_ids";

                requestJson(url, {}, parserOptions, function (data) {
                    try {
                        var date = play.type === "tv" ? data.first_air_date : data.release_date;
                        var year = play.year || (date ? String(date).slice(0, 4) : "");
                        done({
                            title: play.title || data.title || data.original_title || data.name || data.original_name || "",
                            year: year,
                            imdbId: play.imdbId || data.imdb_id || (data.external_ids && data.external_ids.imdb_id) || "",
                            totalSeasons: play.totalSeasons || data.number_of_seasons || ""
                        });
                    } catch (e) {
                        fail("VidSrc: TMDB detail parse failed.");
                    }
                }, function () {
                    fail("VidSrc: TMDB detail request failed.");
                });
            }

            function fetchVideasySeed(mediaId, parserOptions, done, fail) {
                requestJson("https://api.speedracelight.com/seed?mediaId=" + encodeURIComponent(mediaId), {}, parserOptions, function (data) {
                    try {
                        if (!data.seed) return fail("VidSrc: Videasy seed missing.");
                        done(data.seed);
                    } catch (e) {
                        fail("VidSrc: Videasy seed parse failed.");
                    }
                }, function () {
                    fail("VidSrc: Videasy seed request failed.");
                });
            }

            function tryVideasySource(index, sourceOrder, play, seed, meta, parserOptions, success, onError, lastError) {
                if (index >= sourceOrder.length) return onError(lastError || "VidSrc: no real Videasy HLS source found.");

                var sourceName = sourceOrder[index];
                var url = buildVideasySourceApiUrl(sourceName, play, seed, meta);

                function failOrTryNext(reason) {
                    var message = buildVideasySourceError(sourceName, reason);
                    if (index + 1 >= sourceOrder.length) return onError(message);
                    return tryVideasySource(index + 1, sourceOrder, play, seed, meta, parserOptions, success, onError, message);
                }

                requestText(url, {}, parserOptions, function (payload) {
                    try {
                        var apiError = getVideasyApiErrorMessage(payload);
                        var textPayload = String(payload || "").trim();

                        if (apiError) {
                            return failOrTryNext(apiError);
                        }

                        if (!textPayload) {
                            return failOrTryNext("/sources-with-title 返回空内容");
                        }

                        var json = JSON.parse(decodeVideasyPayload(textPayload, seed, play.id));
                        var finalUrl = chooseBestVideasySource(json);
                        if (finalUrl) return success(addPlaybackProxy(finalUrl, sourceName));
                        failOrTryNext("未返回可播放 m3u8/mp4/mpd 地址");
                    } catch (e) {
                        failOrTryNext("返回内容解析失败");
                    }
                }, function (error) {
                    var requestError = error ? normalizeErrorMessage(error).replace(/^VidSrc:\s*/i, "") : "请求失败";
                    failOrTryNext(requestError);
                });
            }

            function getVideasyApiErrorMessage(payload) {
                var data = null;
                var statusCode;
                var message;

                if (!payload) return "";

                if (typeof payload === "object") {
                    data = payload;
                } else {
                    var text = String(payload || "").trim();
                    if (!/^\{/.test(text)) return "";
                    try {
                        data = JSON.parse(text);
                    } catch (e) {
                        return "";
                    }
                }

                if (!data || typeof data !== "object") return "";

                statusCode = Number(data.statusCode || data.status || data.code || 0);
                message = String(data.message || data.error || data.statusText || "").trim();
                if (statusCode >= 400) return "HTTP " + statusCode + (message ? ": " + message : "");
                if (data.error && data.message) return message;
                if (/failed to load sources/i.test(message)) return message;
                return "";
            }

            function buildVideasySourceApiUrl(sourceName, play, seed, meta) {
                var pathMap = {
                    cdn: "cdn",
                    vsrc: "vsrc",
                    downloader2: "downloader2",
                    m4uhd: "m4uhd",
                    superflix: "superflix",
                    hdmovie: "hdmovie",
                    lamovie: "lamovie"
                };
                var path = pathMap[sourceName] || "cdn";
                var params = {
                    title: encodeURIComponent(meta.title || ""),
                    mediaType: play.type === "tv" ? "tv" : "movie",
                    year: meta.year || "",
                    episodeId: play.episode || "1",
                    seasonId: play.season || "1",
                    tmdbId: play.id,
                    imdbId: meta.imdbId || "",
                    enc: "2",
                    seed: seed
                };
                if (play.type === "tv" && meta.totalSeasons) params.totalSeasons = meta.totalSeasons;
                return "https://api.speedracelight.com/" + path + "/sources-with-title?" + toQueryString(params);
            }

            function chooseBestVideasySource(data) {
                var list = [];
                if (data && isPlayableMediaUrl(data.playlist || "")) return data.playlist;
                if (data && Array.isArray(data.sources)) list = data.sources.slice();
                if (!list.length) return "";

                list.sort(function (a, b) {
                    return qualityScore(b) - qualityScore(a);
                });

                for (var i = 0; i < list.length; i++) {
                    if (list[i] && isPlayableMediaUrl(list[i].url || "")) return list[i].url;
                }
                return "";
            }

            function getVidfastRealApiBaseUrl(parserOptions) {
                var baseUrl = readRuntimeString("vidfast_real_api_url", "vidfast_real_api", "url", "") ||
                    readRuntimeString("vidfast_real_api_endpoint", "vidfast_real_api", "endpoint", "") ||
                    readRuntimeString("vidfast_api_url", "vidfast_real_api", "api_url", "");

                if (!baseUrl) baseUrl = "https://proxy.aston.rocks/";
                if (!/^https?:\/\//i.test(baseUrl)) return "";
                return normalizeProxyBase(baseUrl);
            }

            function buildVidfastRealApiUrl(baseUrl, play) {
                var params = {
                    tmdbId: play.id,
                    mediaType: play.type === "tv" ? "tv" : "movie",
                    season: play.season || "1",
                    episode: play.episode || "1",
                    source: play.source || "auto",
                    title: play.title || "",
                    year: play.year || "",
                    imdbId: play.imdbId || "",
                    totalSeasons: play.totalSeasons || ""
                };
                var query = toQueryString(addPlaybackProxyRoutingParams(params, "vidfast_real_api"));
                var cleanBase = String(baseUrl || "").replace(/\/+$/, "");

                if (/\/vidfast\/resolve(?:[?#]|$)/i.test(cleanBase)) {
                    return cleanBase + (cleanBase.indexOf("?") > -1 ? "&" : "?") + query;
                }

                return cleanBase + "/vidfast/resolve?" + query;
            }

            function normalizeVidfastApiStreams(data) {
                var list = [];
                var seen = {};

                function add(item) {
                    var url = String((item && (item.url || item.file || item.src || item.playlist)) || "").trim();
                    var quality = String((item && (item.quality || item.label || item.name)) || "auto");

                    if (!isPlayableMediaUrl(url) || seen[url]) return;
                    seen[url] = true;
                    list.push({
                        url: url,
                        quality: quality,
                        title: quality,
                        source: item && item.source ? item.source : ""
                    });
                }

                if (data && isPlayableMediaUrl(data.playlist || "")) {
                    add({ url: data.playlist, quality: "auto", source: data.source || "" });
                }

                if (data && Array.isArray(data.streams)) {
                    data.streams.forEach(add);
                }

                list.sort(function (a, b) {
                    return qualityScore(b) - qualityScore(a);
                });

                return list;
            }

            function qualityScore(item) {
                var text = String((item && (item.quality || item.label || item.name)) || "");
                var match = text.match(/(\d{3,4})p/i);
                if (match) return parseInt(match[1], 10);
                if (/4k|2160/i.test(text)) return 2160;
                if (/auto|hls|vimeos|voesx/i.test(text)) return 1000;
                return 0;
            }

            function getVidfastSourceList() {
                return ["vrapid", "vedge", "cobra", "cine", "vfast", "horizon", "bravo"];
            }

            function normalizeSourceKey(value) {
                return String(value || "").toLowerCase().replace(/[^a-z0-9]+/g, "");
            }

            function getVidfastSourceConfig(sourceName) {
                var key = normalizeSourceKey(sourceName || "auto");
                var configs = {
                    vrapid: { key: "vrapid", title: "vRapid", aliases: ["vrapid", "rapid"] },
                    vedge: { key: "vedge", title: "vEdge", aliases: ["vedge", "edge"] },
                    cobra: { key: "cobra", title: "Cobra", aliases: ["cobra"] },
                    cine: { key: "cine", title: "Cine", aliases: ["cine"] },
                    vfast: { key: "vfast", title: "vFast", aliases: ["vfast", "fast"] },
                    horizon: { key: "horizon", title: "Horizon", aliases: ["horizon"] },
                    bravo: { key: "bravo", title: "Bravo", aliases: ["bravo"] }
                };
                return configs[key] || null;
            }

            function getVidfastSourceOrder(sourceName) {
                var key = normalizeSourceKey(sourceName || "auto");
                if (key === "auto") return getVidfastSourceList();
                return getVidfastSourceConfig(key) ? [key] : [];
            }

            function resolveVidfastRealMedia(play, parserOptions, success, fail) {
                var sourceOrder = getVidfastSourceOrder(play.source);

                if (!sourceOrder.length) return fail("VidSrc: unsupported VidFast source: " + play.source);

                fetchVidfastBoot(play, parserOptions, function (boot) {
                    fetchVidfastServers(boot, parserOptions, function (servers) {
                        tryVidfastSource(0, sourceOrder, boot, servers, play, parserOptions, success, fail);
                    }, fail);
                }, fail);
            }

            function resolveVidfastRealApiMedia(play, parserOptions, success, fail) {
                var baseUrl = getVidfastRealApiBaseUrl(parserOptions);
                var url;

                if (!baseUrl) return fail("VidSrc: vidfast_real_api_url is missing.");

                url = buildVidfastRealApiUrl(baseUrl, play);
                requestProviderCandidateByType({
                    url: url,
                    headers: {
                        Accept: "application/json, text/plain, */*"
                    }
                }, "json", parserOptions, function (data) {
                    var result = data;
                    var streams;
                    var selectedSource;

                    if (typeof result === "string") {
                        try {
                            result = JSON.parse(result);
                        } catch (e) {
                            return fail("VidSrc: VidFast API returned invalid JSON.");
                        }
                    }

                    if (result && result.ok === false) {
                        return fail("VidSrc: " + (result.error || result.message || "VidFast API failed."));
                    }

                    streams = normalizeVidfastApiStreams(result);
                    if (!streams.length) return fail("VidSrc: VidFast API returned empty streams.");

                    selectedSource = String((result && (result.selectedSource || result.source)) || play.source || "auto").trim() || "auto";
                    success(addPlaybackProxy(streams[0].url, selectedSource));
                }, function (error, exception) {
                    fail(normalizeErrorMessage(error || exception) || "VidSrc: VidFast API request failed.");
                });
            }

            function getCinesrcRealApiBaseUrl(parserOptions) {
                var baseUrl = readRuntimeString("cinesrc_real_api_url", "cinesrc_real_api", "url", "") ||
                    readRuntimeString("cinesrc_real_api_endpoint", "cinesrc_real_api", "endpoint", "") ||
                    readRuntimeString("cinesrc_api_url", "cinesrc_real_api", "api_url", "");

                if (!/^https?:\/\//i.test(baseUrl)) return "";
                return normalizeProxyBase(baseUrl);
            }

            function buildCinesrcRealApiUrl(baseUrl, play) {
                var params = {
                    tmdbId: play.id,
                    mediaType: play.type === "tv" ? "tv" : "movie",
                    season: play.season || "1",
                    episode: play.episode || "1",
                    source: play.source || "auto",
                    title: play.title || "",
                    year: play.year || "",
                    imdbId: play.imdbId || "",
                    totalSeasons: play.totalSeasons || ""
                };
                var query = toQueryString(addPlaybackProxyRoutingParams(params, "cinesrc_real_api"));
                var cleanBase = String(baseUrl || "").replace(/\/+$/, "");

                if (/\/cinesrc\/resolve(?:[?#]|$)/i.test(cleanBase)) {
                    return cleanBase + (cleanBase.indexOf("?") > -1 ? "&" : "?") + query;
                }

                return cleanBase + "/cinesrc/resolve?" + query;
            }

            function normalizeCinesrcApiStreams(data) {
                return normalizeVidfastApiStreams(data);
            }

            function resolveCinesrcRealApiMedia(play, parserOptions, success, fail) {
                var baseUrl = getCinesrcRealApiBaseUrl(parserOptions);
                var url;

                if (!baseUrl) return fail("VidSrc: cinesrc_real_api_url is missing.");

                url = buildCinesrcRealApiUrl(baseUrl, play);
                requestProviderCandidateByType({
                    url: url,
                    headers: {
                        Accept: "application/json, text/plain, */*"
                    }
                }, "json", parserOptions, function (data) {
                    var result = data;
                    var streams;
                    var selectedSource;

                    if (typeof result === "string") {
                        try {
                            result = JSON.parse(result);
                        } catch (e) {
                            return fail("VidSrc: CineSrc API returned invalid JSON.");
                        }
                    }

                    if (result && result.ok === false) {
                        return fail("VidSrc: " + (result.error || result.message || "CineSrc API failed."));
                    }

                    streams = normalizeCinesrcApiStreams(result);
                    if (!streams.length) return fail("VidSrc: CineSrc API returned empty streams.");

                    selectedSource = String((result && (result.selectedSource || result.source)) || play.source || "auto").trim() || "auto";
                    success(addPlaybackProxy(streams[0].url, selectedSource));
                }, function (error, exception) {
                    fail(normalizeErrorMessage(error || exception) || "VidSrc: CineSrc API request failed.");
                });
            }

            function fetchVidfastBoot(play, parserOptions, done, fail) {
                var embedUrl = buildVidfastEmbedUrl(play);

                requestText(embedUrl, buildVidfastHeaders({
                    Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8"
                }), parserOptions, function (html) {
                    var token = extractVidfastToken(html);

                    if (!token) return fail("VidSrc: VidFast token missing.");

                    requestJson(vidfastEncDecApi + "/enc-vidfast?text=" + encodeURIComponent(token), buildVidfastApiHeaders(), parserOptions, function (data) {
                        var statusCode = Number(data && data.status);
                        var boot = data && data.result;

                        if (data && data.status !== undefined && statusCode !== 200) return fail("VidSrc: VidFast enc failed.");
                        if (!boot || !boot.servers || !boot.stream) return fail("VidSrc: VidFast boot data missing.");

                        done(boot);
                    }, function (error) {
                        fail(normalizeErrorMessage(error) || "VidSrc: VidFast enc request failed.");
                    });
                }, function (error) {
                    fail(normalizeErrorMessage(error) || "VidSrc: VidFast page request failed.");
                });
            }

            function buildVidfastEmbedUrl(play) {
                if (play.type === "tv") {
                    return vidfastSite + "/tv/" +
                        encodeURIComponent(play.id) + "/" +
                        encodeURIComponent(play.season || "1") + "/" +
                        encodeURIComponent(play.episode || "1");
                }
                return vidfastSite + "/movie/" + encodeURIComponent(play.id);
            }

            function extractVidfastToken(html) {
                var text = String(html || "");
                var patterns = [
                    /\\\"en\\\"\s*:\s*\\\"([^\\\"]{20,})\\\"/,
                    /"en"\s*:\s*"([^"]{20,})"/,
                    /&quot;en&quot;\s*:\s*&quot;([^&]{20,})&quot;/
                ];
                var i;
                var match;

                for (i = 0; i < patterns.length; i++) {
                    match = text.match(patterns[i]);
                    if (match && match[1]) return match[1];
                }

                return "";
            }

            function buildVidfastHeaders(extra) {
                var headers = {
                    "User-Agent": vidfastUa,
                    Referer: vidfastSite + "/",
                };
                Object.keys(extra || {}).forEach(function (key) {
                    headers[key] = extra[key];
                });
                return headers;
            }

            function buildVidfastApiHeaders(extra) {
                var headers = {
                    "User-Agent": vidfastUa,
                    Accept: "application/json, text/plain, */*",
                    Referer: vidfastSite + "/",
                    Origin: vidfastSite
                };
                Object.keys(extra || {}).forEach(function (key) {
                    headers[key] = extra[key];
                });
                return headers;
            }

            function fetchVidfastServers(boot, parserOptions, done, fail) {
                var headers = buildVidfastHeaders(boot.token ? { "X-CSRF-Token": boot.token } : {});

                requestPostText(boot.servers, headers, " ", parserOptions, function (payload) {
                    decryptVidfastPayload(payload, parserOptions, function (servers) {
                        if (!Array.isArray(servers) || !servers.length) return fail("VidSrc: VidFast server list empty.");
                        done(servers);
                    }, fail);
                }, function (error) {
                    fail(normalizeErrorMessage(error) || "VidSrc: VidFast servers request failed.");
                });
            }

            function tryVidfastSource(index, sourceOrder, boot, servers, play, parserOptions, success, onError, lastError) {
                var sourceName;
                var sourceConfig;
                var server;
                var streamUrl;
                var headers;

                if (index >= sourceOrder.length) return onError(lastError || "VidSrc: no real VidFast HLS source found.");

                sourceName = sourceOrder[index];
                sourceConfig = getVidfastSourceConfig(sourceName);
                server = findVidfastServer(servers, sourceName);

                function failOrTryNext(reason) {
                    var title = sourceConfig ? sourceConfig.title : sourceName;
                    var message = buildVidfastSourceError(title, reason);
                    if (index + 1 >= sourceOrder.length) return onError(message);
                    return tryVidfastSource(index + 1, sourceOrder, boot, servers, play, parserOptions, success, onError, message);
                }

                if (!sourceConfig) return failOrTryNext("未知线路");
                if (!server || !server.data) return failOrTryNext("服务器未返回");

                streamUrl = String(boot.stream || "").replace(/\/+$/, "") + "/" + server.data;
                headers = buildVidfastHeaders(boot.token ? { "X-CSRF-Token": boot.token } : {});

                requestPostText(streamUrl, headers, " ", parserOptions, function (payload) {
                    decryptVidfastPayload(payload, parserOptions, function (data) {
                        var finalUrl = chooseBestVidfastSource(data);
                        if (finalUrl) return success(addPlaybackProxy(finalUrl, sourceName));
                        failOrTryNext("未返回可播放 m3u8/mp4/mpd 地址");
                    }, failOrTryNext);
                }, function (error) {
                    failOrTryNext(error || "请求失败");
                });
            }

            function findVidfastServer(servers, sourceName) {
                var config = getVidfastSourceConfig(sourceName);
                var aliases = config ? config.aliases || [config.key] : [sourceName];
                var i;
                var a;
                var serverKey;

                for (i = 0; i < servers.length; i++) {
                    serverKey = normalizeSourceKey(servers[i] && (servers[i].name || servers[i].title || servers[i].key || servers[i].id));
                    for (a = 0; a < aliases.length; a++) {
                        if (serverKey === normalizeSourceKey(aliases[a])) return servers[i];
                    }
                }

                return null;
            }

            function buildVidfastSourceError(sourceName, reason) {
                var detail = normalizeErrorMessage(reason).replace(/^VidSrc:\s*/i, "");
                return "VidSrc: VidFast " + sourceName + " 线路没有可播放数据" + (detail ? "（" + detail + "）" : "");
            }

            function decryptVidfastPayload(payload, parserOptions, done, fail) {
                var encrypted = String(payload || "").trim();

                if (!encrypted) return fail("VidSrc: VidFast encrypted payload missing.");

                requestPostJson(vidfastEncDecApi + "/dec-vidfast", buildVidfastApiHeaders({
                    "Content-Type": "application/json"
                }), JSON.stringify({ text: encrypted }), parserOptions, function (data) {
                    var statusCode = Number(data && data.status);
                    var result = data && data.result;
                    var text;

                    try {
                        if (data && data.status !== undefined && statusCode !== 200) return fail("VidSrc: VidFast dec failed.");
                        if (typeof result === "string") {
                            text = result.trim();
                            result = /^[\[{]/.test(text) ? JSON.parse(text) : text;
                        }
                        done(result);
                    } catch (e) {
                        fail("VidSrc: VidFast decrypted payload parse failed.");
                    }
                }, function (error) {
                    fail(normalizeErrorMessage(error) || "VidSrc: VidFast dec request failed.");
                });
            }

            function chooseBestVidfastSource(data) {
                var list = [];
                var i;

                if (data && isPlayableMediaUrl(data.url || "")) return data.url;
                if (data && isPlayableMediaUrl(data.playlist || "")) return data.playlist;
                if (data && Array.isArray(data.sources)) list = data.sources.slice();
                if (!list.length) return "";

                list.sort(function (a, b) {
                    return qualityScore(b) - qualityScore(a);
                });

                for (i = 0; i < list.length; i++) {
                    if (list[i] && isPlayableMediaUrl(list[i].url || "")) return list[i].url;
                }
                return "";
            }

            function resolveVidsrcInRealMedia(play, parserOptions, success, fail) {
                var entryUrl = buildVidsrcInEmbedUrl(play);

                requestText(entryUrl, buildVidsrcInHeaders(vidsrcInSite + "/", {
                    Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8"
                }), parserOptions, function (html) {
                    var iframeUrl = resolveUrl(entryUrl, extractIframeSrc(html)) || buildVidsrcInVsembedUrl(play);
                    resolveVidsrcInVsembed(iframeUrl, entryUrl, parserOptions, success, fail);
                }, function () {
                    resolveVidsrcInVsembed(buildVidsrcInVsembedUrl(play), entryUrl, parserOptions, success, fail);
                });
            }

            function resolveVidsrcInVsembed(embedUrl, referer, parserOptions, success, fail) {
                requestText(embedUrl, buildVidsrcInHeaders(referer, {
                    Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8"
                }), parserOptions, function (html) {
                    var dataApi = extractVidsrcInDataApi(html);
                    var sourceApiUrl;

                    if (!dataApi) return fail("VidSrc: VidSrc.in data-api missing.");

                    sourceApiUrl = resolveUrl(embedUrl, dataApi);
                    requestJson(sourceApiUrl, buildVidsrcInHeaders(embedUrl, {
                        Accept: "application/json, text/plain, */*"
                    }), parserOptions, function (data) {
                        var cloudUrl = data && data.src;

                        if (!cloudUrl) return fail("VidSrc: VidSrc.in cloud source missing.");
                        resolveVidsrcInCloud(cloudUrl, embedUrl, parserOptions, success, fail);
                    }, function (error) {
                        fail(normalizeErrorMessage(error) || "VidSrc: VidSrc.in source request failed.");
                    });
                }, function (error) {
                    fail(normalizeErrorMessage(error) || "VidSrc: VidSrc.in embed request failed.");
                });
            }

            function resolveVidsrcInCloud(cloudUrl, referer, parserOptions, success, fail) {
                requestText(cloudUrl, buildVidsrcInHeaders(referer, {
                    Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8"
                }), parserOptions, function (html) {
                    var cloudConfig = extractAssignedObject(html, "CFG") || {};
                    var playerPath = cloudConfig.playerUrl || extractIframeSrc(html);
                    var playerUrl;

                    if (!playerPath) return fail("VidSrc: VidSrc.in player URL missing.");

                    playerUrl = resolveUrl(cloudUrl, playerPath);
                    requestText(playerUrl, buildVidsrcInHeaders(cloudUrl, {
                        Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8"
                    }), parserOptions, function (playerHtml) {
                        var playerConfig = extractAssignedObject(playerHtml, "CONFIG") || {};
                        var apiUrl = getVidsrcInStreamApiUrl(playerConfig, cloudConfig, playerUrl);

                        if (!apiUrl) return fail("VidSrc: VidSrc.in stream API missing.");

                        requestJson(apiUrl, buildVidsrcInHeaders(playerUrl, {
                            Accept: "application/json, text/plain, */*"
                        }), parserOptions, function (streamData) {
                            resolveVidsrcInStreamData(streamData, playerUrl, parserOptions, success, fail);
                        }, function (error) {
                            fail(normalizeErrorMessage(error) || "VidSrc: VidSrc.in stream API request failed.");
                        });
                    }, function (error) {
                        fail(normalizeErrorMessage(error) || "VidSrc: VidSrc.in player request failed.");
                    });
                }, function (error) {
                    fail(normalizeErrorMessage(error) || "VidSrc: VidSrc.in cloud request failed.");
                });
            }

            function buildVidsrcInEmbedUrl(play) {
                if (play.type === "tv") {
                    return vidsrcInSite + "/embed/tv/" +
                        encodeURIComponent(play.id) + "/" +
                        encodeURIComponent(play.season || "1") + "/" +
                        encodeURIComponent(play.episode || "1");
                }

                return vidsrcInSite + "/embed/movie/" + encodeURIComponent(play.id);
            }

            function buildVidsrcInVsembedUrl(play) {
                if (play.type === "tv") {
                    return vidsrcInEmbedHost + "/embed/tv/" +
                        encodeURIComponent(play.id) + "/" +
                        encodeURIComponent(play.season || "1") + "/" +
                        encodeURIComponent(play.episode || "1");
                }

                return vidsrcInEmbedHost + "/embed/movie/" + encodeURIComponent(play.id) + "/";
            }

            function buildVidsrcInHeaders(referer, extra) {
                var headers = {
                    "User-Agent": browserUa,
                    Referer: referer || vidsrcInSite + "/"
                };

                extra = extra || {};
                Object.keys(extra).forEach(function (key) {
                    headers[key] = extra[key];
                });

                return headers;
            }

            function extractIframeSrc(html) {
                var match = String(html || "").match(/<iframe\b[^>]*\bsrc=(["'])(.*?)\1/i);
                return match && match[2] ? decodeHtmlEntities(match[2]) : "";
            }

            function extractVidsrcInDataApi(html) {
                var match = String(html || "").match(/\bdata-api=(["'])(.*?)\1/i);
                return match && match[2] ? decodeHtmlEntities(match[2]) : "";
            }

            function decodeHtmlEntities(value) {
                return String(value || "")
                    .replace(/&amp;/g, "&")
                    .replace(/&quot;/g, "\"")
                    .replace(/&#39;|&apos;/g, "'")
                    .replace(/&lt;/g, "<")
                    .replace(/&gt;/g, ">");
            }

            function extractAssignedObject(html, name) {
                var text = String(html || "");
                var marker = "window." + name;
                var index = text.indexOf(marker);
                var equalsIndex;
                var braceIndex;
                var objectText;

                while (index > -1) {
                    equalsIndex = text.indexOf("=", index + marker.length);
                    braceIndex = equalsIndex > -1 ? text.indexOf("{", equalsIndex + 1) : -1;
                    objectText = braceIndex > -1 ? extractBalancedObjectText(text, braceIndex) : "";

                    if (objectText) {
                        try {
                            return JSON.parse(objectText);
                        } catch (e) { }
                    }

                    index = text.indexOf(marker, index + marker.length);
                }

                return null;
            }

            function extractBalancedObjectText(text, startIndex) {
                var depth = 0;
                var inString = false;
                var quote = "";
                var escaped = false;
                var i;
                var ch;

                for (i = startIndex; i < text.length; i++) {
                    ch = text.charAt(i);

                    if (inString) {
                        if (escaped) {
                            escaped = false;
                        } else if (ch === "\\") {
                            escaped = true;
                        } else if (ch === quote) {
                            inString = false;
                        }
                        continue;
                    }

                    if (ch === "\"" || ch === "'") {
                        inString = true;
                        quote = ch;
                        continue;
                    }

                    if (ch === "{") depth++;
                    if (ch === "}") {
                        depth--;
                        if (depth === 0) return text.slice(startIndex, i + 1);
                    }
                }

                return "";
            }

            function getVidsrcInStreamApiUrl(playerConfig, cloudConfig, playerUrl) {
                var apiUrl = (playerConfig && playerConfig.api) || "";

                if (!apiUrl && cloudConfig && cloudConfig.metaApi) {
                    apiUrl = cloudConfig.metaApi + (cloudConfig.metaApi.indexOf("?") > -1 ? "&" : "?") + "stream_urls";
                }

                return apiUrl ? resolveUrl(playerUrl, apiUrl) : "";
            }

            function resolveVidsrcInStreamData(apiData, playerUrl, parserOptions, success, fail) {
                var code = apiData && (apiData.status_code || apiData.status);
                var data = apiData && apiData.data && typeof apiData.data === "object" ? apiData.data : apiData;
                var streamPayload = data && (data.stream_urls || data.streams || data.sources);
                var vs = (apiData && apiData.vs) || (data && data.vs);

                if (code && String(code) !== "200") return fail("VidSrc: VidSrc.in stream API returned " + code + ".");

                applyVidsrcInStreamSubtitles(apiData, playerUrl, parserOptions);

                decryptVidsrcInStreamUrls(streamPayload, vs, parserOptions, function (urls) {
                    var playableUrls = normalizeVidsrcInStreamUrls(urls);

                    if (!playableUrls.length) return fail("VidSrc: VidSrc.in stream list empty.");
                    stampVidsrcInStreamUrl(0, playableUrls, playerUrl, parserOptions, success, fail);
                }, fail);
            }

            function decryptVidsrcInStreamUrls(streamPayload, vs, parserOptions, done, fail) {
                var plainUrls = normalizeVidsrcInStreamUrls(streamPayload);
                var encrypted;

                if (plainUrls.length) return done(plainUrls);
                if (typeof streamPayload !== "string") return fail("VidSrc: VidSrc.in encrypted stream data missing.");
                encrypted = streamPayload.trim();
                if (!encrypted) return fail("VidSrc: VidSrc.in encrypted stream data empty.");

                if (isAndroidPlatform()) {
                    return decryptVidsrcInStreamUrlsViaService(encrypted, vs, parserOptions, done, fail);
                }

                if (typeof WebAssembly === "undefined" || !WebAssembly.instantiate) {
                    return decryptVidsrcInStreamUrlsViaService(encrypted, vs, parserOptions, done, fail);
                }

                fetchVidsrcInWasmBytes(vs, function (wasmBytes) {
                    WebAssembly.instantiate(wasmBytes, {}).then(function (result) {
                        var instance = result && result.instance ? result.instance : result;
                        var exports = instance && instance.exports;
                        var encryptedBytes;
                        var ptr;
                        var outLen;
                        var text;

                        if (!exports || !exports.memory || typeof exports.alloc !== "function" || typeof exports.decrypt !== "function") {
                            return fail("VidSrc: VidSrc.in wasm exports missing.");
                        }

                        try {
                            encryptedBytes = base64UrlToBytes(encrypted);
                            ptr = exports.alloc(encryptedBytes.length);
                            new Uint8Array(exports.memory.buffer).set(encryptedBytes, ptr);
                            outLen = exports.decrypt(ptr, encryptedBytes.length);
                            text = bytesToUtf8(new Uint8Array(exports.memory.buffer, ptr + 12, outLen));
                            done(normalizeVidsrcInStreamUrls(text));
                        } catch (e) {
                            fail("VidSrc: VidSrc.in stream decrypt failed.");
                        }
                    }, function () {
                        fail("VidSrc: VidSrc.in wasm instantiate failed.");
                    });
                }, fail);
            }

            function decryptVidsrcInStreamUrlsViaService(streamPayload, vs, parserOptions, done, fail) {
                var body = JSON.stringify({
                    streamPayload: streamPayload,
                    vs: vs || {}
                });
                var candidates = getVidsrcInDecryptServiceUrls();
                var lastError = "";
                var lastUrl = "";
                var i = 0;

                parserOptions = parserOptions || {};

                if (!candidates.length) {
                    return fail("VidSrc: vidsrc_in_decrypt_service or vidsrc_in_stream_proxy is required for VidSrc.in decrypt on this platform.");
                }

                tryNext();

                function tryNext() {
                    var decryptUrl;

                    if (i >= candidates.length) {
                        return fail(lastError || "VidSrc: VidSrc.in decrypt service request failed.");
                    }

                    decryptUrl = candidates[i++];
                    lastUrl = decryptUrl;

                    requestProviderCandidateByType({
                        url: decryptUrl,
                        headers: {
                            "Content-Type": "application/json",
                            Accept: "application/json, text/plain, */*"
                        }
                    }, "json", parserOptions, function (data) {
                        var urls;

                        if (typeof data === "string") {
                            try {
                                data = JSON.parse(data);
                            } catch (e) {
                                lastError = "VidSrc: VidSrc.in decrypt service returned invalid JSON.";
                                return tryNext();
                            }
                        }

                        if (data && data.ok === false) {
                            lastError = "VidSrc: " + (data.error || "VidSrc.in decrypt service failed.");
                            return tryNext();
                        }

                        urls = normalizeVidsrcInStreamUrls(data && (data.urls || data.result || data.data));
                        if (!urls.length) {
                            lastError = "VidSrc: VidSrc.in decrypt service returned empty stream list.";
                            return tryNext();
                        }

                        done(urls);
                    }, function (error, exception) {
                        lastError = decodeProviderRequestError(decryptUrl, parserOptions, error, exception) || "VidSrc: VidSrc.in decrypt service request failed.";
                        tryNext();
                    }, "POST", body);
                }
            }

            function fetchVidsrcInWasmBytes(vs, done, fail) {
                if (vs && typeof vs.wasm === "string" && vs.wasm.length > 32) {
                    try {
                        return done(base64UrlToBytes(vs.wasm));
                    } catch (e) {
                        return fail("VidSrc: VidSrc.in inline wasm decode failed.");
                    }
                }

                if (!vs || !vs.wasm_url) return fail("VidSrc: VidSrc.in wasm URL missing.");
                if (typeof fetch !== "function") return fail("VidSrc: fetch is unavailable for VidSrc.in wasm.");

                fetch(vs.wasm_url, { credentials: "omit" }).then(function (response) {
                    if (!response || !response.ok) throw new Error("HTTP " + (response && response.status));
                    if (!response.arrayBuffer) throw new Error("arrayBuffer unavailable");
                    return response.arrayBuffer();
                }).then(done, function () {
                    fail("VidSrc: VidSrc.in wasm request failed.");
                });
            }

            function normalizeVidsrcInStreamUrls(value) {
                var list = [];

                function add(url) {
                    url = String(url || "").trim();
                    if (url && isPlayableMediaUrl(url)) list.push(url);
                }

                if (Array.isArray(value)) {
                    value.forEach(function (item) {
                        if (typeof item === "string") return add(item);
                        add(item && (item.url || item.file || item.src || item.playlist));
                    });
                } else if (typeof value === "string") {
                    value.split(/\r?\n/).forEach(add);
                }

                return list;
            }

            function getVidsrcInPreferredSubtitleCode() {
                var code = "";

                try {
                    if (typeof Lampa !== "undefined" && Lampa.Storage) {
                        if (typeof Lampa.Storage.field === "function") {
                            code = Lampa.Storage.field("tmdb_lang") || "";
                        }
                        if (!code && typeof Lampa.Storage.get === "function") {
                            code = Lampa.Storage.get("tmdb_lang", "");
                        }
                    }
                } catch (e) { }

                code = String(code || "").trim().toLowerCase();
                if (!code) return "";
                return normalizeVidsrcInSubtitleCode(code);
            }

            function normalizeVidsrcInSubtitleCode(value) {
                var code = String(value || "").trim().toLowerCase();
                var aliases = {
                    afrikaans: "af",
                    arabic: "ar",
                    ara: "ar",
                    bul: "bg",
                    chinese: "zh",
                    chi: "zh",
                    zho: "zh",
                    cze: "cs",
                    ces: "cs",
                    dan: "da",
                    dut: "nl",
                    dutch: "nl",
                    deu: "de",
                    eng: "en",
                    english: "en",
                    fre: "fr",
                    french: "fr",
                    fra: "fr",
                    ger: "de",
                    german: "de",
                    gre: "el",
                    ell: "el",
                    heb: "he",
                    hindi: "hi",
                    hin: "hi",
                    hun: "hu",
                    ind: "id",
                    ita: "it",
                    italian: "it",
                    jpn: "ja",
                    japanese: "ja",
                    kor: "ko",
                    korean: "ko",
                    lav: "lv",
                    lit: "lt",
                    may: "ms",
                    nor: "no",
                    pol: "pl",
                    polish: "pl",
                    por: "pt",
                    portuguese: "pt",
                    rus: "ru",
                    russian: "ru",
                    slo: "sk",
                    slv: "sl",
                    spa: "es",
                    spanish: "es",
                    swe: "sv",
                    tam: "ta",
                    tel: "te",
                    tha: "th",
                    thai: "th",
                    tur: "tr",
                    turkish: "tr",
                    ukr: "uk",
                    vie: "vi",
                    vietnamese: "vi"
                };

                if (!code) return "";
                code = code.split(/[-_]/)[0];
                code = code.replace(/\s*\(.*\)$/, "");
                if (/[\u0600-\u06FF]/.test(code)) return "ar";
                if (/[\u4E00-\u9FFF]/.test(code)) return "zh";
                if (/[ぁ-んァ-ン]/.test(code)) return "ja";
                if (/[가-힣]/.test(code)) return "ko";
                return aliases[code] || code;
            }

            function normalizeVidsrcInStreamSubtitles(value, playerUrl) {
                var preferredCode = getVidsrcInPreferredSubtitleCode();
                var list = [];
                var seen = {};

                function priority(code) {
                    if (preferredCode && code === preferredCode) return 0;
                    if (code === "en") return 1;
                    return 2;
                }

                function add(item) {
                    var rawUrl = item && (item.url || item.file || item.src || item.path);
                    var url = String(rawUrl || "").trim();
                    var resolvedUrl = url;
                    var code = normalizeVidsrcInSubtitleCode(item && (item.code || item.language || item.lang_code || item.langCode || item.locale));
                    var label = String(item && (item.lang || item.label || item.name || item.code) || "").trim();

                    if (!url || seen[url]) return;
                    if (!/^https?:\/\//i.test(resolvedUrl) && playerUrl) {
                        resolvedUrl = resolveUrl(playerUrl, resolvedUrl);
                    }
                    if (!/^https?:\/\//i.test(resolvedUrl)) return;

                    seen[url] = true;
                    list.push({
                        sourceIndex: list.length,
                        index: list.length,
                        label: label || code || "Subtitle",
                        language: code,
                        code: code,
                        url: resolvedUrl
                    });
                }

                if (Array.isArray(value)) {
                    value.forEach(add);
                } else if (value && typeof value === "object") {
                    add(value);
                }

                list.sort(function (a, b) {
                    var scoreA = priority(a.language || "");
                    var scoreB = priority(b.language || "");

                    if (scoreA !== scoreB) return scoreA - scoreB;
                    return (a.sourceIndex || 0) - (b.sourceIndex || 0);
                });

                list.forEach(function (item, index) {
                    item.index = index;
                    delete item.sourceIndex;
                });

                return list;
            }

            function applyVidsrcInStreamSubtitles(apiData, playerUrl, parserOptions) {
                var data = apiData && apiData.data && typeof apiData.data === "object" ? apiData.data : apiData;
                var subtitles = normalizeVidsrcInStreamSubtitles(
                    (apiData && (apiData.default_subs || apiData.defaultSubs || apiData.subtitles)) ||
                    (data && (data.default_subs || data.defaultSubs || data.subtitles)) ||
                    [],
                    playerUrl
                );
                var element = parserOptions && parserOptions.helpers && parserOptions.helpers.element;

                if (!subtitles.length) {
                    if (data && typeof data === "object") delete data.subtitles;
                    if (apiData && typeof apiData === "object") delete apiData.subtitles;
                    if (element && typeof element === "object") delete element.subtitles;
                    return subtitles;
                }

                if (data && typeof data === "object") data.subtitles = subtitles;
                if (apiData && typeof apiData === "object") apiData.subtitles = subtitles;

                if (element && typeof element === "object") {
                    if (Array.isArray(element.subtitles)) {
                        element.subtitles.length = 0;
                        subtitles.forEach(function (item) {
                            element.subtitles.push(item);
                        });
                    } else {
                        element.subtitles = subtitles;
                    }
                }

                return subtitles;
            }

            function stampVidsrcInStreamUrl(index, urls, playerUrl, parserOptions, success, fail, lastError) {
                var url;
                var origin;
                var streamProxyBase;
                var tokenUrl;
                var tokenHeaders;
                var playbackHeaders;

                if (index >= urls.length) return fail(lastError || "VidSrc: VidSrc.in token request failed.");

                url = urls[index];
                origin = getUrlOrigin(url);
                if (!origin) return success(url);

                streamProxyBase = getVidsrcInStreamProxyBase();
                playbackHeaders = buildVidsrcInPlaybackHeaders(playerUrl);
                tokenUrl = origin + "/generate.php";
                tokenHeaders = buildVidsrcInHeaders(playerUrl, {
                    Accept: "text/plain,application/json,*/*"
                });

                if (streamProxyBase) {
                    tokenUrl = buildProviderProxyUrl(streamProxyBase, tokenUrl, playbackHeaders, true);
                    tokenHeaders = {};
                }

                requestText(tokenUrl, tokenHeaders, parserOptions, function (payload) {
                    var token = parseVidsrcInToken(payload);
                    var finalUrl = applyVidsrcInToken(url, token);
                    if (streamProxyBase) finalUrl = buildProviderProxyUrl(streamProxyBase, finalUrl, playbackHeaders, true);
                    success(finalUrl);
                }, function (error) {
                    stampVidsrcInStreamUrl(index + 1, urls, playerUrl, parserOptions, success, fail, normalizeErrorMessage(error));
                });
            }

            function getVidsrcInStreamProxyBase() {
                var proxyBase = readRuntimeString("vidsrc_in_stream_proxy", "vidsrc_in_real", "stream_proxy", "") ||
                    readRuntimeString("vidsrc_in_hls_proxy", "vidsrc_in_real", "hls_proxy", "") ||
                    readRuntimeString("vidsrc_in_playback_proxy", "vidsrc_in_real", "playback_proxy", "");

                if (!/^https?:\/\/[^/]+/i.test(proxyBase)) return "";
                return normalizeProxyBase(proxyBase);
            }

            function getVidsrcInDecryptServiceUrls() {
                var urls = [];
                var proxyBase = getVidsrcInStreamProxyBase();
                var serviceUrl = readRuntimeString("vidsrc_in_decrypt_service", "vidsrc_in_real", "decrypt_service", "") ||
                    readRuntimeString("vidsrc_in_decrypt_url", "vidsrc_in_real", "decrypt_url", "") ||
                    readRuntimeString("vidsrc_in_decrypt_proxy", "vidsrc_in_real", "decrypt_proxy", "");
                var normalizedServiceUrl;
                var fallbackUrl;

                if (proxyBase) {
                    fallbackUrl = normalizeProxyBase(proxyBase) + "vidsrc-in/decrypt";
                    urls.push(fallbackUrl);
                }

                if (/^https?:\/\/[^/]+/i.test(serviceUrl)) {
                    serviceUrl = serviceUrl.replace(/\/+$/, "");
                    normalizedServiceUrl = /\/vidsrc-in\/decrypt$/i.test(serviceUrl) ? serviceUrl : serviceUrl + "/vidsrc-in/decrypt";
                    if (urls.indexOf(normalizedServiceUrl) === -1) urls.push(normalizedServiceUrl);
                }

                return urls;
            }

            function buildVidsrcInPlaybackHeaders(playerUrl) {
                var refererOrigin = getUrlOrigin(playerUrl) || "https://cloudorchestranova.com";

                return buildVidsrcInHeaders(refererOrigin + "/", {
                    Accept: "*/*",
                    Origin: refererOrigin,
                    Referer: refererOrigin + "/"
                });
            }

            function parseVidsrcInToken(payload) {
                var text;

                if (payload && typeof payload === "object") {
                    return String(payload.token || payload.data || payload.string || payload.result || "");
                }

                text = String(payload || "").trim();
                if (!text) return "";

                try {
                    var data = JSON.parse(text);
                    if (typeof data === "string") return data;
                    if (data && typeof data === "object") return String(data.token || data.data || data.string || data.result || "");
                } catch (e) { }

                return text;
            }

            function applyVidsrcInToken(url, token) {
                token = String(token || "").trim();
                if (!token || /[?&]token=/i.test(url)) return url;
                if (url.indexOf("__TOKEN__") > -1) return url.split("__TOKEN__").join(token);
                return url + (url.indexOf("?") > -1 ? "&" : "?") + "token=" + encodeURIComponent(token);
            }

            function getUrlOrigin(url) {
                var match = String(url || "").match(/^(https?:\/\/[^/?#]+)/i);
                return match ? match[1] : "";
            }

            function resolveUrl(base, value) {
                var text = String(value || "").trim();
                var origin;
                var cleanBase;

                if (!text) return "";
                if (/^https?:\/\//i.test(text)) return text;
                if (/^\/\//.test(text)) return "https:" + text;

                try {
                    if (typeof URL !== "undefined") return new URL(text, base).href;
                } catch (e) { }

                origin = getUrlOrigin(base);
                if (text.charAt(0) === "/") return origin ? origin + text : text;

                cleanBase = String(base || "").split(/[?#]/)[0];
                cleanBase = cleanBase.replace(/\/[^/]*$/, "/");
                return cleanBase + text;
            }

            function requestJson(url, headers, parserOptions, done, fail) {
                requestByType(url, "json", headers, parserOptions, function (data) {
                    if (typeof data !== "string") return done(data);
                    try {
                        done(JSON.parse(data));
                    } catch (e) {
                        fail("VidSrc: JSON parse failed.");
                    }
                }, fail);
            }

            function requestText(url, headers, parserOptions, done, fail) {
                requestByType(url, "text", headers, parserOptions, done, fail);
            }

            function requestPostJson(url, headers, postBody, parserOptions, done, fail) {
                requestByType(url, "json", headers, parserOptions, function (data) {
                    if (typeof data !== "string") return done(data);
                    try {
                        done(JSON.parse(data));
                    } catch (e) {
                        fail("VidSrc: JSON parse failed.");
                    }
                }, fail, "POST", postBody);
            }

            function requestPostText(url, headers, postBody, parserOptions, done, fail) {
                requestByType(url, "text", headers, parserOptions, done, fail, "POST", postBody);
            }



            function isAndroidPlatform() {
                try {
                    return typeof Lampa !== "undefined" &&
                        Lampa.Platform &&
                        typeof Lampa.Platform.is === "function" &&
                        Lampa.Platform.is("android");
                } catch (e) {
                    return false;
                }
            }

            function hasLampaPlatform() {
                try {
                    return typeof Lampa !== "undefined" && !!(Lampa.Platform && Lampa.Platform.is);
                } catch (e) {
                    return false;
                }
            }

            function shouldUseProviderProxyByPlatform() {
                return hasLampaPlatform();
            }

            function isVidfastRequestUrl(url) {
                var host = getUrlHost(url);
                return host === "vidfast.vc" || host === "enc-dec.app";
            }

            function isVidsrcInRequestUrl(url) {
                var text = String(url || "");
                var host = getUrlHost(text);
                return host === "vidsrc.in" ||
                    host === "vsembed.ru" ||
                    host === "cloudorchestranova.com" ||
                    host === "data.vidsrcme.ru" ||
                    /\/generate\.php(?:[?#]|$)/i.test(text);
            }

            function isKnownProxyUrl(url) {
                var text = String(url || "");
                var streamProxyBase = getVidsrcInStreamProxyBase();
                var i;

                if (/^https?:\/\/(?:cf\.aston\.rocks|stnh70-ap\.hf\.space)\//i.test(text)) return true;
                if (streamProxyBase && text.indexOf(streamProxyBase) === 0) return true;

                for (i = 0; i < vidsrcProxyBaseUrls.length; i++) {
                    if (text.indexOf(normalizeProxyBase(vidsrcProxyBaseUrls[i])) === 0) return true;
                }
                return false;
            }

            function normalizeProxyBase(base) {
                base = String(base || "");
                if (!base) return "";
                return /\/$/.test(base) ? base : base + "/";
            }

            function buildProviderProxyUrl(base, url, headers, encodedTarget) {
                var proxy = normalizeProxyBase(base);
                var key;

                if (!url || !proxy || isKnownProxyUrl(url)) return url;

                headers = headers || {};
                for (key in headers) {
                    if (!Object.prototype.hasOwnProperty.call(headers, key)) continue;
                    if (headers[key] === undefined || headers[key] === null || headers[key] === "") continue;
                    proxy += "param/" + encodeURIComponent(String(key)) + "=" + encodeURIComponent(String(headers[key])) + "/";
                }

                return proxy + (encodedTarget ? "u/" + encodeURIComponent(url) : url);
            }

            function buildProviderProxyCandidates(url, headers) {
                var candidates = [];
                var i;
                var proxyUrl;

                for (i = 0; i < vidsrcProxyBaseUrls.length; i++) {
                    proxyUrl = buildProviderProxyUrl(vidsrcProxyBaseUrls[i], url, headers);
                    if (proxyUrl && proxyUrl !== url) candidates.push({ url: proxyUrl, headers: {} });
                }

                return candidates;
            }

            function buildProviderProxyCandidatesWithBases(url, headers, baseUrls) {
                var candidates = [];
                var i;
                var proxyUrl;

                for (i = 0; i < baseUrls.length; i++) {
                    proxyUrl = buildProviderProxyUrl(baseUrls[i], url, headers);
                    if (proxyUrl && proxyUrl !== url) candidates.push({ url: proxyUrl, headers: {} });
                }

                return candidates;
            }

            function mergeRequestHeaders(options, headers) {
                var merged = {};
                var key;

                options = options || {};
                if (typeof options.headers === "string") {
                    try {
                        merged = JSON.parse(options.headers);
                    } catch (e) {
                        merged = {};
                    }
                } else if (options.headers && typeof options.headers === "object") {
                    for (key in options.headers) {
                        if (Object.prototype.hasOwnProperty.call(options.headers, key)) merged[key] = options.headers[key];
                    }
                }

                headers = headers || {};
                for (key in headers) {
                    if (Object.prototype.hasOwnProperty.call(headers, key)) merged[key] = headers[key];
                }

                options.headers = merged;
                return options;
            }

            function buildProviderDirectRequestConfig(headers) {
                var requestConfig = {
                    direct: true,
                    site_proxy: "",
                    use_proxy: false,
                    headers: {}
                };
                var key;

                headers = headers || {};
                for (key in headers) {
                    if (Object.prototype.hasOwnProperty.call(headers, key)) requestConfig.headers[key] = headers[key];
                }

                return requestConfig;
            }

            function decodeProviderRequestError(url, parserOptions, a, c) {
                var network = parserOptions && parserOptions.network;
                var decoded = "";
                var fallback = "";
                var host = getUrlHost(url);

                try {
                    if (network && typeof network.errorDecode === "function") decoded = network.errorDecode(a, c);
                } catch (e) { }

                fallback = normalizeErrorMessage(decoded || a || c);
                if (!fallback || /未知错误|unknown error|\[object object\]/i.test(fallback)) {
                    fallback = normalizeErrorMessage(a) || normalizeErrorMessage(c);
                }
                if (!fallback || /未知错误|unknown error|\[object object\]/i.test(fallback)) {
                    fallback = "VidSrc: 请求失败" + (host ? " (" + host + ")" : "");
                }

                return fallback;
            }

            function requestProviderCandidateByType(candidate, dataType, parserOptions, done, fail, requestMethod, bodyToSend) {
                var network = parserOptions && parserOptions.network;
                var helpers = (parserOptions && parserOptions.helpers) || {};
                var requestConfig = buildProviderDirectRequestConfig(candidate.headers || {});
                var request;

                requestMethod = String(requestMethod || "GET").toUpperCase();
                bodyToSend = requestMethod === "POST" ? (bodyToSend === undefined || bodyToSend === null ? " " : bodyToSend) : false;

                if (!network || !network.native) return fail("VidSrc: network.native is unavailable.");

                if (helpers.buildRuleRequest && helpers.requestRuleNative) {
                    request = helpers.buildRuleRequest(candidate.url, dataType, requestConfig, {
                        method: requestMethod,
                        type: requestMethod,
                        postData: requestMethod === "POST" ? bodyToSend : ""
                    });
                    request.options = mergeRequestHeaders(request.options, requestConfig.headers);
                    request.options.type = requestMethod;
                    if (request.fallbackOptions) {
                        request.fallbackOptions = mergeRequestHeaders(request.fallbackOptions, requestConfig.headers);
                        request.fallbackOptions.type = requestMethod;
                    }
                    return helpers.requestRuleNative(network, request, done, fail, bodyToSend);
                }

                return network.native(candidate.url, done, fail, bodyToSend, {
                    dataType: dataType,
                    headers: requestConfig.headers,
                    type: requestMethod
                });
            }

            function getVidfastRequestCandidates(url, headers) {
                var proxyCandidates = buildProviderProxyCandidates(url, headers);
                var directCandidate = { url: url, headers: headers || {} };

                if (!shouldUseProviderProxyByPlatform()) {
                    return [directCandidate];
                }

                if (isAndroidPlatform()) {
                    return proxyCandidates.concat([directCandidate]);
                }

                return [directCandidate].concat(proxyCandidates);
            }

            function getVidsrcInRequestCandidates(url, headers) {
                var proxyCandidates = buildProviderProxyCandidatesWithBases(url, headers, getVidsrcInProxyBaseUrls(url));
                var directCandidate = { url: url, headers: headers || {} };
                var isTokenRequest = /\/generate\.php(?:[?#]|$)/i.test(String(url || ""));

                if (isTokenRequest) {
                    return [directCandidate];
                }

                if (!shouldUseProviderProxyByPlatform()) {
                    return [directCandidate];
                }

                if (isAndroidPlatform()) {
                    return [directCandidate].concat(proxyCandidates);
                }

                return proxyCandidates.concat([directCandidate]);
            }

            function getVidsrcInProxyBaseUrls(url) {
                var host = getUrlHost(url);
                var isTokenRequest = /\/generate\.php(?:[?#]|$)/i.test(String(url || ""));

                if (host === "cloudorchestranova.com" || host === "data.vidsrcme.ru") {
                    return ["https://cf.aston.rocks/", "https://stnh70-ap.hf.space/"];
                }

                if (host === "vsembed.ru" || isTokenRequest) {
                    return vidsrcInProxyBaseUrls;
                }

                return ["https://cf.aston.rocks/", "https://stnh70-ap.hf.space/"];
            }

            function requestVidfastByType(url, dataType, headers, parserOptions, done, fail, method, postBody) {
                parserOptions = parserOptions || {};
                var network = parserOptions.network;
                var requestMethod = String(method || "GET").toUpperCase();
                var bodyToSend = requestMethod === "POST" ? (postBody === undefined || postBody === null ? " " : postBody) : false;
                var candidates = getVidfastRequestCandidates(url, headers || {});

                if (!network || !network.native) return fail("VidSrc: network.native is unavailable.");

                function next(index, lastError) {
                    var candidate;

                    if (index >= candidates.length) return fail(lastError || "VidSrc: VidFast request failed.");

                    candidate = candidates[index];
                    requestProviderCandidateByType(candidate, dataType, parserOptions, done, function (error, exception) {
                        next(index + 1, decodeProviderRequestError(candidate.url, parserOptions, error, exception));
                    }, requestMethod, bodyToSend);
                }

                next(0, null);
            }

            function requestVidsrcInByType(url, dataType, headers, parserOptions, done, fail, method, postBody) {
                parserOptions = parserOptions || {};
                var network = parserOptions.network;
                var requestMethod = String(method || "GET").toUpperCase();
                var bodyToSend = requestMethod === "POST" ? (postBody === undefined || postBody === null ? " " : postBody) : false;
                var candidates = getVidsrcInRequestCandidates(url, headers || {});

                if (!network || !network.native) return fail("VidSrc: network.native is unavailable.");

                function next(index, lastError) {
                    var candidate;

                    if (index >= candidates.length) return fail(lastError || "VidSrc: VidSrc.in request failed.");

                    candidate = candidates[index];
                    requestProviderCandidateByType(candidate, dataType, parserOptions, done, function (error, exception) {
                        next(index + 1, decodeProviderRequestError(candidate.url, parserOptions, error, exception));
                    }, requestMethod, bodyToSend);
                }

                next(0, null);
            }

            function requestByType(url, dataType, headers, parserOptions, done, fail, method, postBody) {
                parserOptions = parserOptions || {};
                var network = parserOptions.network;
                var config = parserOptions.config || {};
                var helpers = parserOptions.helpers || {};
                var requestConfig = {};
                var requestMethod = String(method || "GET").toUpperCase();
                var bodyToSend = requestMethod === "POST" ? (postBody === undefined || postBody === null ? " " : postBody) : false;
                var key;

                for (key in config) {
                    if (Object.prototype.hasOwnProperty.call(config, key)) requestConfig[key] = config[key];
                }
                requestConfig.headers = headers || {};
                if (requestMethod === "POST") requestConfig.method = "POST";
                if (requestMethod === "POST") requestConfig.type = "POST";

                if (isVidfastRequestUrl(url)) {
                    return requestVidfastByType(url, dataType, requestConfig.headers, parserOptions, done, fail, requestMethod, bodyToSend);
                }

                if (isVidsrcInRequestUrl(url)) {
                    return requestVidsrcInByType(url, dataType, requestConfig.headers, parserOptions, done, fail, requestMethod, bodyToSend);
                }

                if (helpers.buildRuleRequest && helpers.requestRuleNative) {
                    var request = helpers.buildRuleRequest(url, dataType, requestConfig, {
                        method: requestMethod,
                        type: requestMethod,
                        postData: requestMethod === "POST" ? bodyToSend : ""
                    });
                    request.options = mergeRequestHeaders(request.options, requestConfig.headers);
                    request.options.type = requestMethod;
                    if (request.fallbackOptions) {
                        request.fallbackOptions = mergeRequestHeaders(request.fallbackOptions, requestConfig.headers);
                        request.fallbackOptions.type = requestMethod;
                    }
                    return helpers.requestRuleNative(network, request, done, fail, bodyToSend);
                }

                if (network && network.native) {
                    return network.native(url, done, fail, bodyToSend, {
                        dataType: dataType,
                        headers: requestConfig.headers,
                        type: requestMethod
                    });
                }

                fail("VidSrc: network.native is unavailable.");
            }

            function toQueryString(params) {
                var parts = [];
                Object.keys(params).forEach(function (key) {
                    if (params[key] === undefined || params[key] === null) return;
                    parts.push(encodeURIComponent(key) + "=" + encodeURIComponent(String(params[key])));
                });
                return parts.join("&");
            }

            function decodeVideasyPayload(payload, seed, mediaId) {
                var bytes = base64UrlToBytes(payload);
                var state = videasyInitialState(seed, parseInt(mediaId, 10) || 0);
                var key = new Uint8Array(bytes.length);
                var counter = 0;
                var i;
                var word;

                for (i = 0; i < bytes.length;) {
                    word = videasyNextWord(state, counter++);
                    key[i++] = word & 255;
                    if (i < bytes.length) key[i++] = (word >>> 8) & 255;
                    if (i < bytes.length) key[i++] = (word >>> 16) & 255;
                    if (i < bytes.length) key[i++] = (word >>> 24) & 255;
                }

                for (i = 0; i < bytes.length; i++) bytes[i] ^= key[i];
                if (bytes[0] !== 109 || bytes[1] !== 118 || bytes[2] !== 109 || bytes[3] !== 49) {
                    throw new Error("bad Videasy payload magic");
                }

                return bytesToUtf8(bytes.subarray(4));
            }

            function videasyInitialState(seed, mediaId) {
                var i;
                if (videasyOddTri(seed.length)) {
                    var s256 = [];
                    for (i = 0; i < 256; i++) s256[i] = i;
                    var swapIndex = 0;
                    for (i = 0; i < 256; i++) {
                        swapIndex = (swapIndex + s256[i] + seed.charCodeAt(i % seed.length)) & 255;
                        var tmp = s256[i];
                        s256[i] = s256[swapIndex];
                        s256[swapIndex] = tmp;
                    }
                    var acc = 1732584193;
                    for (i = 0; i < seed.length; i++) {
                        acc = videasyRotl((acc ^ Math.imul(seed.charCodeAt(i), videasyF[15 & i])) >>> 0, 5);
                    }
                    return { s: s256, acc: videasyMix(acc) };
                }

                var s61 = [];
                var a = videasyMix(videasyFnv(seed) ^ videasyMix((mediaId >>> 0) ^ 2654435769)) >>> 0;
                for (i = 0; i < 8; i++) {
                    if (videasyEvenTri(i)) {
                        var slot = a % 61;
                        a = videasyRotl((a + 2654435769) >>> 0, 7 + (7 & i));
                        s61[slot] = (a ^ videasyMix(a)) >>> 0;
                        a = videasyMix((a + slot) >>> 0);
                    } else {
                        s61[i] = videasyF[15 & i];
                    }
                }
                return { s: s61, acc: videasyMix(2779096485 ^ a) >>> 0 };
            }

            function videasyNextWord(state, count) {
                var s = state.s;
                var old = state.acc >>> 0;
                var slot = old % 61;
                var existsMask = 0 - Number(slot in s);
                var d = s[slot] >>> 0;
                var mixed = (d ^ Math.imul(2654435769, count + 1)) >>> 0;
                var word = ((old ^ mixed) >>> 0 | (old & mixed & existsMask) >>> 0) >>> 0;
                word = (videasyRotl((word + old) >>> 0, 31 & slot) ^ videasyRotl(old, 31 & Math.imul(slot, 7))) >>> 0;
                word = videasyMix((word + 2654435769) >>> 0);
                s[slot] = word >>> 0;
                state.acc = word >>> 0;
                return word >>> 0;
            }

            function videasyEvenTri(value) {
                return ((value * (value + 1)) & 1) === 0;
            }

            function videasyOddTri(value) {
                return ((value * (value + 1)) & 1) === 1;
            }

            function videasyMix(value) {
                value >>>= 0;
                value ^= value >>> 16;
                value = Math.imul(value, 2246822507) >>> 0;
                value ^= value >>> 13;
                value = Math.imul(value, 3266489909) >>> 0;
                value ^= value >>> 16;
                return value >>> 0;
            }

            function videasyRotl(value, shift) {
                value >>>= 0;
                shift &= 31;
                return shift === 0 ? value >>> 0 : ((value << shift) | (value >>> (32 - shift))) >>> 0;
            }

            function videasyFnv(seed) {
                var hash = 2166136261;
                for (var i = 0; i < seed.length; i++) {
                    hash = Math.imul(hash ^ seed.charCodeAt(i), 16777619) >>> 0;
                }
                return videasyMix(hash);
            }

            function base64UrlToBytes(value) {
                var text = String(value || "").replace(/-/g, "+").replace(/_/g, "/");
                while (text.length % 4) text += "=";
                var binary;
                var i;

                if (typeof atob === "function") {
                    binary = atob(text);
                } else if (typeof Buffer !== "undefined") {
                    binary = Buffer.from(text, "base64").toString("binary");
                } else {
                    throw new Error("base64 decoder unavailable");
                }

                var bytes = new Uint8Array(binary.length);
                for (i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
                return bytes;
            }

            function bytesToUtf8(bytes) {
                if (typeof TextDecoder !== "undefined") {
                    return new TextDecoder("utf-8").decode(bytes);
                }

                var binary = "";
                for (var i = 0; i < bytes.length; i++) binary += String.fromCharCode(bytes[i]);
                try {
                    return decodeURIComponent(escape(binary));
                } catch (e) {
                    return binary;
                }
            }

            try {
                if (/^https?:\/\//i.test(sourceUrl)) {
                    if (isPlayableMediaUrl(sourceUrl)) return onSuccess(addPlaybackProxy(sourceUrl, ""));
                    return onError("VidSrc: resolved URL is not a playable media file.");
                }

                var parsed = parseVidsrcPlayUrl(sourceUrl);
                if (!parsed) return onError("VidSrc: detail URL reached stream parser. Use playlist parser first.");
                if (!parsed.id) return onError("VidSrc: missing TMDB id.");
                return resolveProviderMedia(parsed, options, onSuccess, onError);
            } catch (e) {
                onError("VidSrc stream error: " + (e && e.message ? e.message : e));
            }
        },
        'olehdtvjson_parser': function (sourceUrl, options, onSuccess, onError) {
            onSuccess(options.helpers.element.url);
        },
        ikanbot_hls_direct_v2: function (sourceUrl, options, onSuccess, onError) {
            try {
                var url = new URL(sourceUrl);
                if (!/^https?:$/.test(url.protocol) || !/\.m3u8$/i.test(url.pathname)) return onError('ikanbot [媒体]: 选集不是直接 HLS 地址');
                var config = options.config || {};
                var headers = options.helpers.generateHeaders(config).jsonString;
                Object.keys(headers).forEach(function (key) { if (/^(cookie|authorization|referer|origin)$/i.test(key)) delete headers[key]; });
                var page = new URL(config.link || 'https://www.ikanbot.com');
                headers.Referer = page.protocol + '//' + page.host + '/';
                headers.Origin = page.protocol + '//' + page.host;
                onSuccess({ url: url.href, headers: headers });
            } catch (error) { onError('ikanbot [媒体]: ' + error.message); }
        },

        'libvio_script_parser': function (sourceUrl, options, onSuccess, onError) {
            options = options || {};
            var network = options.network;
            var config = options.config || {};
            var helpers = options.helpers || {};
            var cryptoSalt = 'RY7e48naFXPsLJC';
            var defaultUa = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/138.0.0.0 Safari/537.36';

            function ensureUrl(url, baseUrl) {
                if (!url) return '';
                url = String(url).replace(/&amp;/g, '&');
                if (/^\/\//.test(url)) {
                    try { return new URL(baseUrl || sourceUrl).protocol + url; } catch (e) { return 'https:' + url; }
                }
                if (/^https?:\/\//i.test(url)) return url;
                try { return new URL(url, baseUrl || sourceUrl).href; } catch (e) { return url; }
            }

            function hasHeader(headers, name) {
                var expected = String(name || '').toLowerCase();
                for (var key in headers) {
                    if (Object.prototype.hasOwnProperty.call(headers, key) && String(key).toLowerCase() === expected) return true;
                }
                return false;
            }

            function copyConfig() {
                var requestConfig = {};
                for (var key in config) {
                    if (Object.prototype.hasOwnProperty.call(config, key)) requestConfig[key] = config[key];
                }
                return requestConfig;
            }

            function buildHeaders(refererUrl, originUrl) {
                var headers = {};
                if (config.headers) {
                    for (var key in config.headers) {
                        if (Object.prototype.hasOwnProperty.call(config.headers, key)) headers[key] = config.headers[key];
                    }
                }
                if (!hasHeader(headers, 'User-Agent')) headers['User-Agent'] = defaultUa;
                if (!hasHeader(headers, 'Origin')) {
                    try { headers['Origin'] = new URL(originUrl || refererUrl || sourceUrl).origin; } catch (e) { }
                }
                if (!hasHeader(headers, 'Referer')) headers['Referer'] = refererUrl || config.link || sourceUrl;
                return headers;
            }

            function decodeNetworkError(a, c) {
                if (network && network.errorDecode) return network.errorDecode(a, c);
                if (c) return String(c);
                if (a && a.message) return a.message;
                return String(a || 'unknown error');
            }

            function requestRule(url, dataType, headers, postBody, done, fail) {
                var requestConfig = copyConfig();
                if (headers) requestConfig.headers = headers;
                if (postBody) requestConfig.method = 'POST';
                if (helpers.buildRuleRequest && helpers.requestRuleNative) {
                    var meta = {
                        method: postBody ? 'POST' : 'GET',
                        postData: postBody || ''
                    };
                    var request = helpers.buildRuleRequest(url, dataType || 'text', requestConfig, meta);
                    helpers.requestRuleNative(network, request, done, fail, postBody || false);
                    return;
                }
                network["native"](url, done, fail, postBody || false, {
                    dataType: dataType || 'text',
                    headers: requestConfig.headers
                });
            }

            function normalizeText(text) {
                return String(text || '')
                    .replace(/\n|\r/g, '')
                    .replace(/\\\//g, '/')
                    .replace(/&amp;/g, '&')
                    .replace(/\\/g, '');
            }

            function trimUrl(url) {
                return String(url || '').replace(/[)\]}<>\s]+$/g, '');
            }

            function extractPlayableUrl(text, baseUrl) {
                var normalized = normalizeText(text);
                var mediaMatch = /['"]((?:https?:)?\/\/[^'"\s]*\.(?:m3u8|mp4|m4s|webm|mpd)(?:\?[^'"\s>]*)?)/i.exec(normalized);
                if (mediaMatch && mediaMatch[1]) return ensureUrl(trimUrl(mediaMatch[1]), baseUrl);
                var relativeMedia = /['"]((?:\/|\.\.?\/)[^'"\s]*\.(?:m3u8|mp4|m4s|webm|mpd)(?:\?[^'"\s>]*)?)/i.exec(normalized);
                if (relativeMedia && relativeMedia[1]) return ensureUrl(trimUrl(relativeMedia[1]), baseUrl);
                var shareMatch = /['"]((?:https?:)?\/\/(?:pan\.quark\.cn|pan\.baidu\.com|drive\.uc\.cn)[^'"\s]*)/i.exec(normalized);
                if (shareMatch && shareMatch[1]) return ensureUrl(trimUrl(shareMatch[1]), baseUrl);
                var fieldMediaMatch = /(?:PlayUrl|playurl|play_url|video_url|videoUrl|player_url|src|url)\s*[:=]\s*['"]((?:https?:)?\/\/[^'"\s]*\.(?:m3u8|mp4|m4s|webm|mpd)(?:\?[^'"\s>]*)?)/i.exec(normalized);
                if (fieldMediaMatch && fieldMediaMatch[1]) return ensureUrl(trimUrl(fieldMediaMatch[1]), baseUrl);
                var fieldRelativeMedia = /(?:PlayUrl|playurl|play_url|video_url|videoUrl|player_url|src|url)\s*[:=]\s*['"]((?:\/|\.\.?\/)[^'"\s]*\.(?:m3u8|mp4|m4s|webm|mpd)(?:\?[^'"\s>]*)?)/i.exec(normalized);
                if (fieldRelativeMedia && fieldRelativeMedia[1]) return ensureUrl(trimUrl(fieldRelativeMedia[1]), baseUrl);
                var fieldShareMatch = /(?:PlayUrl|playurl|play_url|video_url|videoUrl|player_url|src|url)\s*[:=]\s*['"]((?:https?:)?\/\/(?:pan\.quark\.cn|pan\.baidu\.com|drive\.uc\.cn)[^'"\s]*)/i.exec(normalized);
                if (fieldShareMatch && fieldShareMatch[1]) return ensureUrl(trimUrl(fieldShareMatch[1]), baseUrl);
                var looseMedia = /((?:https?:)?\/\/[^'"\s,]+\.(?:m3u8|mp4|m4s|webm|mpd)(?:\?[^'"\s>]*)?)/i.exec(normalized);
                if (looseMedia && looseMedia[1]) return ensureUrl(trimUrl(looseMedia[1]), baseUrl);
                var looseRelativeMedia = /(^|[\s"'(])((?:\/|\.\.?\/)[^'"\s,]+\.(?:m3u8|mp4|m4s|webm|mpd)(?:\?[^'"\s>]*)?)/i.exec(normalized);
                if (looseRelativeMedia && looseRelativeMedia[2]) return ensureUrl(trimUrl(looseRelativeMedia[2]), baseUrl);
                var looseShare = /((?:https?:)?\/\/(?:pan\.quark\.cn|pan\.baidu\.com|drive\.uc\.cn)\/[^'"\s<]+)/i.exec(normalized);
                if (looseShare && looseShare[1]) return ensureUrl(trimUrl(looseShare[1]), baseUrl);
                return '';
            }

            function base64Decode(text) {
                if (typeof atob === 'function') return atob(text);
                if (typeof Buffer !== 'undefined') return Buffer.from(text, 'base64').toString('binary');
                return text;
            }

            function decodePlayerValue(player) {
                if (!player || !player.url) return '';
                var value = String(player.url || '');
                try {
                    if (Number(player.encrypt) === 1) return unescape(value);
                    if (Number(player.encrypt) === 2) return unescape(base64Decode(value));
                } catch (e) { }
                return value;
            }

            function readPlayerConfig(html) {
                var playerMatch = /var\s+player_aaaa\s*=\s*(\{[\s\S]*?\})\s*(?:<\/script>|$)/i.exec(html || '');
                if (!playerMatch || !playerMatch[1]) return null;
                try { return JSON.parse(playerMatch[1]); } catch (e) { return null; }
            }

            function inferIframeUrlFromPlayer(player, baseUrl) {
                if (!player || !player.url || Number(player.encrypt) !== 3) return '';
                var nextUrl = player.link_next ? ensureUrl(player.link_next, baseUrl) : '';
                var query = '?url=' + encodeURIComponent(player.url);
                if (nextUrl) query += '&next=' + encodeURIComponent(nextUrl);
                return ensureUrl('/static/player/artplayer/' + query, baseUrl);
            }

            function readJsString(name, html) {
                var re = new RegExp("(?:var|let|const)\\s+" + name + "\\s*=\\s*([\"'])([\\s\\S]*?)\\1", "i");
                var match = re.exec(html || '');
                return match ? match[2] : '';
            }

            function readJsBoolean(name, html) {
                var re = new RegExp("(?:var|let|const)\\s+" + name + "\\s*=\\s*(true|false)", "i");
                var match = re.exec(html || '');
                if (!match) return null;
                return match[1] === 'true';
            }

            function readQualities(html) {
                var match = /(?:var|let|const)\s+qualities\s*=\s*(\[[\s\S]*?\])\s*;/i.exec(html || '');
                if (!match || !match[1]) return [];
                try { return JSON.parse(match[1]); } catch (e) { }
                try { return Function('return (' + match[1] + ');')(); } catch (e2) { }
                return [];
            }

            function ensureCryptoJS(scriptUrl, refererUrl, done, fail) {
                var root = (typeof window !== 'undefined' && window) ? window : (typeof globalThis !== 'undefined' ? globalThis : this);
                if (root && root.CryptoJS) return done(root.CryptoJS);
                if (typeof CryptoJS !== 'undefined') return done(CryptoJS);
                //scriptUrl change to
                requestRule('https://cdn.bootcdn.net/ajax/libs/crypto-js/4.0.0/crypto-js.min.js', 'text', buildHeaders(refererUrl || scriptUrl, scriptUrl), false, function (cryptoJsCode) {
                    try {
                        var localModule = { exports: {} };
                        var exported = Function('module', 'exports', 'define', 'window', 'self', 'globalThis',
                            String(cryptoJsCode || '') + '; return module.exports || exports || (window && window.CryptoJS) || (self && self.CryptoJS) || (globalThis && globalThis.CryptoJS);'
                        )(localModule, localModule.exports, undefined, root, root, root);
                        if (exported && root && !root.CryptoJS) root.CryptoJS = exported;
                        if (!((root && root.CryptoJS) || (typeof CryptoJS !== 'undefined'))) {
                            (0, eval)(String(cryptoJsCode || ''));
                        }
                        if (root && root.CryptoJS) return done(root.CryptoJS);
                        if (typeof CryptoJS !== 'undefined') return done(CryptoJS);
                        fail('加载 CryptoJS 失败。');
                    } catch (e) {
                        fail('执行 CryptoJS 失败: ' + (e && e.message ? e.message : e));
                    }
                }, function (a, c) {
                    fail('请求 CryptoJS 失败: ' + decodeNetworkError(a, c));
                });
            }

            function decodeLibvioCipher(cipherText, timestampValue, CryptoJS) {
                var md5hex = CryptoJS.MD5(String(timestampValue || '') + cryptoSalt).toString();
                var key = CryptoJS.enc.Utf8.parse(md5hex.substring(16));
                var iv = CryptoJS.enc.Utf8.parse(md5hex.substring(0, 16));
                return CryptoJS.AES.decrypt(String(cipherText || ''), key, {
                    iv: iv,
                    mode: CryptoJS.mode.CBC,
                    padding: CryptoJS.pad.Pkcs7
                }).toString(CryptoJS.enc.Utf8);
            }

            function resolveQualities(iframeUrl, iframeHtml) {
                var timestampValue = readJsString('timestamp', iframeHtml);
                var qualities = readQualities(iframeHtml);
                if (!timestampValue || !qualities.length) return onError('解析失败：qualities 参数不完整。');
                var cryptoJsUrl = ensureUrl('/static/player/artplayer/crypto-js.min.js', iframeUrl);
                ensureCryptoJS(cryptoJsUrl, iframeUrl, function (CryptoJS) {
                    try {
                        for (var i = 0; i < qualities.length; i++) {
                            var rawUrl = qualities[i] && (qualities[i].url || qualities[i].file || qualities[i].src);
                            if (!rawUrl) continue;
                            var direct = extractPlayableUrl(rawUrl, iframeUrl);
                            if (direct) return onSuccess(direct);
                            var decrypted = decodeLibvioCipher(rawUrl, timestampValue, CryptoJS);
                            var finalUrl = extractPlayableUrl(decrypted, iframeUrl);
                            if (!finalUrl && /^https?:\/\//i.test(decrypted || '')) finalUrl = decrypted;
                            if (finalUrl) return onSuccess(ensureUrl(finalUrl, iframeUrl));
                        }
                        onError('解析失败：qualities 解密后未找到播放链接。');
                    } catch (e) {
                        onError('解析失败：qualities 解密失败 - ' + (e && e.message ? e.message : e));
                    }
                }, onError);
            }

            function resolveSmartPlay(iframeUrl, iframeHtml) {
                var playPageUrl = readJsString('playPageUrl', iframeHtml);
                var secretKeySeed = readJsString('secretKeySeed', iframeHtml);
                var timestampValue = readJsString('timestamp', iframeHtml);
                var apiUrlMatch = /(https?:\/\/[^'"\s]+webvideo_ty\.php)/i.exec(iframeHtml || '');
                if (!playPageUrl || !secretKeySeed || !timestampValue) return onError('解析失败：smartplay 参数不完整。');
                var apiUrl = apiUrlMatch ? apiUrlMatch[1] : 'https://hd.ticktockwow.com/smartplay-cache/api/webvideo_ty.php';
                var cryptoJsUrl = ensureUrl('/static/player/artplayer/crypto-js.min.js', iframeUrl);
                ensureCryptoJS(cryptoJsUrl, iframeUrl, function (CryptoJS) {
                    try {
                        var nowTs = Math.floor(Date.now() / 1000);
                        var requestBody = {
                            vkey: playPageUrl,
                            code: secretKeySeed,
                            t: nowTs,
                            signature: CryptoJS.MD5(String(nowTs)).toString()
                        };
                        var iframeOrigin = '';
                        try { iframeOrigin = new URL(iframeUrl).origin; } catch (e) { }
                        var iframeReferer = String(iframeUrl || '').split('#')[0].split('?')[0];
                        // requestRule(apiUrl, 'json', {
                        //     'Content-Type': 'application/json',
                        //     'Origin': iframeOrigin,
                        //     'Referer': iframeReferer,
                        //     'User-Agent': defaultUa,
                        //     'Sec-Fetch-Site': 'cross-site',
                        //     'Sec-Fetch-Mode': 'cors'
                        // }, JSON.stringify(requestBody), function (apiResp) {
                        //     try {
                        //         var payload = apiResp;
                        //         if (typeof payload === 'string') payload = JSON.parse(payload);
                        //         if (!payload || !payload.url) return onError('解析失败：smartplay API 未返回 url。');
                        //         var finalUrl = '';
                        //         if (/^https?:\/\//i.test(payload.url)) finalUrl = payload.url;
                        //         if (!finalUrl) {
                        //             var decrypted = decodeLibvioCipher(payload.url, timestampValue, CryptoJS);
                        //             finalUrl = extractPlayableUrl(decrypted, iframeUrl) || (/^https?:\/\//i.test(decrypted || '') ? decrypted : '');
                        //         }
                        //         if (!finalUrl) return onError('解析失败：smartplay 解密后未找到播放链接。');
                        //         onSuccess(ensureUrl(finalUrl, iframeUrl));
                        //     } catch (e) {
                        //         onError('解析失败：smartplay 响应处理失败 - ' + (e && e.message ? e.message : e));
                        //     }
                        // }, function (a, c) {
                        //     onError('请求 smartplay API 失败: ' + decodeNetworkError(a, c));
                        // });

                        network["native"](
                            (Lampa.Platform.is('android') ? '' : 'https://stnh70-ap.hf.space/param/Content-Type=application%2Fjson/param/Origin=https%3A%2F%2Fwww.libvio.cam/param/Referer=https%3A%2F%2Fwww.libvio.cam%2Fstatic%2Fplayer%2Fartplayer%2F/param/User-Agent=Mozilla%2F5.0%20(Macintosh%3B%20Intel%20Mac%20OS%20X%2010_15_7)%20AppleWebKit%2F537.36%20(KHTML%2C%20like%20Gecko)%20Chrome%2F138.0.0.0%20Safari%2F537.36/param/Sec-Fetch-Site=cross-site/param/Sec-Fetch-Mode=cors/') + apiUrl,
                            function (apiResp) {
                                try {
                                    var payload = apiResp;
                                    if (typeof payload === 'string') payload = JSON.parse(payload);
                                    if (!payload || !payload.url) return onError('解析失败：smartplay API 未返回 url。');
                                    var finalUrl = '';
                                    if (/^https?:\/\//i.test(payload.url)) finalUrl = payload.url;
                                    if (!finalUrl) {
                                        var decrypted = decodeLibvioCipher(payload.url, timestampValue, CryptoJS);
                                        finalUrl = extractPlayableUrl(decrypted, iframeUrl) || (/^https?:\/\//i.test(decrypted || '') ? decrypted : '');
                                    }
                                    if (!finalUrl) return onError('解析失败：smartplay 解密后未找到播放链接。');
                                    onSuccess(ensureUrl(finalUrl, iframeUrl));
                                } catch (e) {
                                    onError('解析失败：smartplay 响应处理失败 - ' + (e && e.message ? e.message : e));
                                }
                            },
                            function () {
                                onError('请求 smartplay API 失败: ' + decodeNetworkError(a, c));
                            },
                            JSON.stringify(requestBody),
                            {
                                dataType: 'json',
                                headers: Lampa.Platform.is('android') ? {
                                    'Content-Type': 'application/json',
                                    'Origin': iframeOrigin,
                                    'Referer': iframeReferer,
                                    'User-Agent': defaultUa,
                                    'Sec-Fetch-Site': 'cross-site',
                                    'Sec-Fetch-Mode': 'cors'
                                } : {}
                            }
                        );
                    } catch (e) {
                        onError('解析失败：smartplay 请求组装失败 - ' + (e && e.message ? e.message : e));
                    }
                }, onError);
            }

            requestRule(sourceUrl, 'text', buildHeaders(config.link || sourceUrl, sourceUrl), false, function (html) {
                var player = readPlayerConfig(html);
                var playerValue = decodePlayerValue(player);
                var playerPlayable = extractPlayableUrl(playerValue, sourceUrl);
                if (playerPlayable) return onSuccess(playerPlayable);
                var sourcePlayable = extractPlayableUrl(html, sourceUrl);
                if (sourcePlayable) return onSuccess(sourcePlayable);
                var iframe = /<iframe[^>]+src=["']([^"']+)["']/i.exec(html || '');
                var iframeUrl = iframe ? ensureUrl(iframe[1], sourceUrl) : inferIframeUrlFromPlayer(player, sourceUrl);
                if (!iframeUrl) return onError('解析失败：未找到播放链接。');
                requestRule(iframeUrl, 'text', buildHeaders(sourceUrl, iframeUrl), false, function (iframeHtml) {
                    var iframePlayable = extractPlayableUrl(iframeHtml, iframeUrl);
                    if (iframePlayable) return onSuccess(iframePlayable);
                    var qualities = readQualities(iframeHtml);
                    if (qualities.length) return resolveQualities(iframeUrl, iframeHtml);
                    var isSmartPlay = readJsBoolean('isSmartPlay', iframeHtml);
                    if (isSmartPlay === true || readJsString('playPageUrl', iframeHtml)) return resolveSmartPlay(iframeUrl, iframeHtml);
                    onError('解析失败：未找到播放链接。');
                }, function (a, c) {
                    onError('请求 iframe 失败: ' + decodeNetworkError(a, c));
                });
            }, function (a, c) {
                onError('请求播放页失败: ' + decodeNetworkError(a, c));
            });
        },

        'standard_m3u8_regex': function (sourceUrl, options, onSuccess, onError) {
            var network = options.network;
            requestStreamNative(options, sourceUrl, function (html) {
                var match = html.match(/"url":"(https?:\/\/[^"]+\.m3u8)"/);
                var streamUrl = match ? match[1].replace(/\\/g, '') : null;
                if (streamUrl) onSuccess(streamUrl);
                else onError("标准正则解析失败");
            }, function (a, c) {
                onError("请求播放页失败: " + network.errorDecode(a, c));
            }, 'text');
        },
        'default': function (sourceUrl, options, onSuccess, onError) {
            onSuccess(sourceUrl);
        },
    },
    URL_PREPROCESSORS: {
        'ole_vv_signature': function (originalUrl, options) {

            function he_es5(char) {
                // char 是单个字符的字符串
                // 获取字符的 Unicode 码点，并转换为二进制字符串
                var binaryChar = char.charCodeAt(0).toString(2);
                return binaryChar;
            }
            var cors = options.cors;
            var hex_md5 = options.helpers.hex_md5; // 假设 md5 函数通过 helpers 传入

            function stripExistingSignature(url) {
                var value = String(url || '');
                var hash = '';
                var hashIndex = value.indexOf('#');
                var queryIndex;
                var base;
                var query;
                var parts;

                if (hashIndex !== -1) {
                    hash = value.substring(hashIndex);
                    value = value.substring(0, hashIndex);
                }

                queryIndex = value.indexOf('?');
                if (queryIndex === -1) return value + hash;

                base = value.substring(0, queryIndex);
                query = value.substring(queryIndex + 1);
                parts = query.split('&').filter(function (part) {
                    return part && part.split('=')[0] !== '_vv';
                });

                return base + (parts.length ? '?' + parts.join('&') : '') + hash;
            }

            function appendSignature(url, signature) {
                var value = stripExistingSignature(url);
                var hash = '';
                var hashIndex = value.indexOf('#');
                var separator;

                if (hashIndex !== -1) {
                    hash = value.substring(hashIndex);
                    value = value.substring(0, hashIndex);
                }

                separator = value.indexOf('?') === -1 ? '?' : '&';
                return value + separator + '_vv=' + signature + hash;
            }

            function uriSignature(url) {
                var currentTimestamp = Math.round(new Date().getTime() / 1000);
                // 1. 时间戳转字符串
                var timestampStr = currentTimestamp.toString();
                // 2. 初始化用于存储二进制片段的数组（用字符串累加）
                var binaryGroups = ["", "", "", ""];

                // 3. 遍历时间戳字符串的每个字符
                for (var i = 0; i < timestampStr.length; i++) {
                    var char = timestampStr[i];
                    // 4. 对每个字符调用 he_es5 函数获取二进制表示
                    var binaryStr = he_es5(char);

                    // 5. 从二进制字符串中提取特定位，并累加到对应的 group
                    //    注意: slice 对于不存在的索引会返回空字符串，+= 会正常工作
                    binaryGroups[0] += binaryStr.slice(2, 3);
                    binaryGroups[1] += binaryStr.slice(3, 4);
                    binaryGroups[2] += binaryStr.slice(4, 5);
                    binaryGroups[3] += binaryStr.slice(5);
                }

                // 6. 处理累加的二进制位串
                var hexParts = [];
                for (i = 0; i < binaryGroups.length; i++) {
                    // 7. 将二进制字符串解析为整数，再转为16进制
                    //    处理空字符串的情况，将其视为 0
                    var decimalVal = parseInt(binaryGroups[i] || "0", 2);
                    if (isNaN(decimalVal)) { // 再次检查以防万一
                        decimalVal = 0;
                    }
                    var hexStr = decimalVal.toString(16);

                    // 8. 对16进制结果进行补零，确保长度为3
                    //    使用 while 循环确保填充正确
                    while (hexStr.length < 3) {
                        hexStr = "0" + hexStr;
                    }
                    // 如果长度超过3（理论上不太可能，但为了健壮性），截断
                    if (hexStr.length > 3) {
                        hexStr = hexStr.slice(0, 3);
                    }

                    // 9. 存储处理后的16进制字符串
                    hexParts[i] = hexStr;
                }

                // 10. 计算原始时间戳字符串的 MD5 哈希
                var md5Hash = hex_md5(timestampStr);

                // 11. 将 MD5 哈希的片段与处理后的4个16进制字符串拼接起来
                var result = md5Hash.slice(0, 3) + hexParts[0] +
                    md5Hash.slice(6, 11) + hexParts[1] +
                    md5Hash.slice(14, 19) + hexParts[2] +
                    md5Hash.slice(22, 27) + hexParts[3] +
                    md5Hash.slice(30);

                // return result;
                return appendSignature(url, result);  // 返回生成的 URL

            };

            // 返回带签名的完整URL
            return cors + uriSignature(originalUrl);
        },
    }
});