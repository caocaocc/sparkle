import os from 'os'

export const defaultConfig: IAppConfig = {
  core: 'mihomo',
  updateChannel: 'stable',
  silentStart: false,
  appTheme: 'system',
  useWindowFrame: false,
  proxyInTray: true,
  maxLogDays: 7,
  proxyCols: 'auto',
  connectionDirection: 'asc',
  connectionOrderBy: 'time',
  useSubStore: false,
  proxyDisplayMode: 'full',
  proxyDisplayOrder: 'default',
  autoCheckUpdate: false,
  autoCloseConnection: true,
  autoEnableSysProxy: true,
  controlDns: true,
  controlSniff: true,
  showTraffic: process.platform === 'win32' ? false : true,
  showFloatingWindow: process.platform === 'win32' ? false : false,
  spinFloatingIcon: false,
  hosts: [],
  siderOrder: [
    'sysproxy',
    'tun',
    'proxy',
    'profile',
    'connection',
    'dns',
    'sniff',
    'mihomo',
    'rule',
    'resource',
    'override',
    'log',
    'substore'
  ],
  siderWidth: 250,
  sysProxy: { enable: false, mode: 'auto' },
  disableLoopbackDetector: false,
  disableEmbedCA: false,
  disableSystemCA: false,
  disableNftables: false,
  safePaths: [],
  disableGPU: process.platform === 'win32' && parseInt(os.release().split('.')[2], 10) <= 20000
}

export const defaultControledMihomoConfig: Partial<IMihomoConfig> = {
  'external-controller': '',
  'external-ui': '',
  'external-ui-url': 'https://github.com/Zephyruso/zashboard/releases/latest/download/dist.zip',
  'external-controller-cors': {
    'allow-origins': ['https://metacubex.github.io', 'https://board.zash.run.place'],
    'allow-private-network': false
  },
  ipv6: true,
  mode: 'rule',
  'mixed-port': 7890,
  'socks-port': 0,
  port: 0,
  'redir-port': 0,
  'tproxy-port': 0,
  'allow-lan': true,
  'unified-delay': true,
  'tcp-concurrent': false,
  'log-level': 'info',
  'find-process-mode': 'strict',
  'global-client-fingerprint': 'chrome',
  'bind-address': '*',
  'lan-allowed-ips': ['0.0.0.0/0', '::/0'],
  'lan-disallowed-ips': [],
  authentication: [],
  'skip-auth-prefixes': ['127.0.0.1/32'],
  tun: {
    enable: false,
    device: 'Mihomo',
    stack: process.platform === 'win32' ? 'gvisor' : 'mixed',
    'auto-route': true,
    'auto-redirect': false,
    'auto-detect-interface': true,
    'dns-hijack': ['any:53'],
    'route-exclude-address': [],
    mtu: 1500
  },
  dns: {
    enable: true,
    ipv6: true,
    'enhanced-mode': 'fake-ip',
    'fake-ip-range': '198.18.0.1/16',
    'fake-ip-filter': ['*', '+.lan', '+.local', 'time.*.com', 'ntp.*.com', '+.market.xiaomi.com'],
    'use-hosts': true,
    'use-system-hosts': true,
    'default-nameserver': ['223.5.5.5'],
    nameserver: ['https://doh.pub/dns-query', 'https://dns.alidns.com/dns-query'],
    'proxy-server-nameserver': ['system', '223.5.5.5'],
    'direct-nameserver': []
  },
  sniffer: {
    enable: true,
    'parse-pure-ip': true,
    'force-dns-mapping': true,
    'override-destination': false,
    sniff: {
      HTTP: {
        ports: [80, 443],
        'override-destination': false
      },
      TLS: {
        ports: [443]
      }
    },
    'skip-domain': ['+.push.apple.com'],
    'skip-dst-address': [
      '91.105.192.0/23',
      '91.108.4.0/22',
      '91.108.8.0/21',
      '91.108.16.0/21',
      '91.108.56.0/22',
      '95.161.64.0/20',
      '149.154.160.0/20',
      '185.76.151.0/24',
      '2001:67c:4e8::/48',
      '2001:b28:f23c::/47',
      '2001:b28:f23f::/48',
      '2a0a:f280:203::/48'
    ]
  },
  profile: {
    'store-selected': true,
    'store-fake-ip': true
  },
  'geo-auto-update': true,
  'geo-update-interval': 24,
  'geodata-mode': false,
  'geox-url': {
    geoip: 'https://github.com/MetaCubeX/meta-rules-dat/releases/download/latest/geoip-lite.dat',
    geosite: 'https://github.com/MetaCubeX/meta-rules-dat/releases/download/latest/geosite.dat',
    mmdb: 'https://github.com/MetaCubeX/meta-rules-dat/releases/download/latest/geoip.metadb',
    asn: 'https://github.com/MetaCubeX/meta-rules-dat/releases/download/latest/GeoLite2-ASN.mmdb'
  }
}

export const defaultProfileConfig: IProfileConfig = {
  items: []
}

export const defaultOverrideConfig: IOverrideConfig = {
  items: []
}

export const defaultProfile: Partial<IMihomoConfig> = {
  proxies: [],
  'proxy-groups': [],
  rules: []
}
