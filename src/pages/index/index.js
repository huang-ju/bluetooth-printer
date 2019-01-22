import Taro, { Component } from '@tarojs/taro'
import { View, Button } from '@tarojs/components'
import Encoding from './encoding'
import './index.scss'

export default class Index extends Component {

  config = {
    navigationBarTitleText: '蓝牙打印机'
  }

  constructor(props) {
    super(props)
    this.state = {
      devices: [],
      connected: false,
      chs: [],
      name: null,
      canWrite: false,
    }
  }


  // 初始化蓝牙模块并搜寻附近的蓝牙设备
  openBlueTooth = () => {
    if (!Taro.openBluetoothAdapter) {
      Taro.showModal({
        title: '提示',
        content: '当前微信版本过低，无法使用该功能，请升级到最新微信版本后重试。'
      })
      return
    }

    // 初始化蓝牙模块
    Taro.openBluetoothAdapter({
      success: () => {
        // 开始搜寻附近的蓝牙设备
        this.startDiscovery()
      },
      fail: (res) => {
        console.log('openBluetoothAdapter fail', res)
        if (res.errCode === 10001) {
          Taro.showModal({
            title: '错误',
            content: '未找到蓝牙设备, 请打开蓝牙后重试。',
            showCancel: false
          })
          // 监听蓝牙适配器状态变化事件
          Taro.onBluetoothAdapterStateChange(() => {
            if (res.available) {
              // 当蓝牙可用时
              // 取消监听，否则startDiscovery后仍会继续触发onBluetoothAdapterStateChange，
              // 导致再次调用startDiscovery
              Taro.onBluetoothAdapterStateChange(() => { });
              this.startDiscovery()
            }
          })
        }
      }
    })
  }

  // 开始蓝牙搜寻
  startDiscovery = () => {
    if (this._discoveryStarted) {
      return
    }

    this._discoveryStarted = true

    Taro.startBluetoothDevicesDiscovery({
      success: () => {
        this.onBluetoothDeviceFound()
      },
      fail: (res) => {
        console.log('蓝牙搜寻失败', res)
      }
    })
  }

  // 发现蓝牙
  onBluetoothDeviceFound = () => {
    Taro.onBluetoothDeviceFound((res) => {
      const that = this
      let foundDevices = that.state.devices
      res.devices.forEach((device) => {
        if (!device.name && !device.localName) {
          return
        }
        // 遍历是否存在该设备
        const idx = this.inArray(foundDevices, 'deviceId', device.deviceId)
        if (idx === -1) {
          foundDevices.push(device)
        } else {
          foundDevices[idx] = device
        }
      })
      this.setState({ devices: foundDevices })
    })
  }

  inArray = (arr, key, val) => {
    console.log('判断是否是数组', Array.isArray(arr), typeof (arr), arr)
    for (let i = 0; i < arr.length; i++) {
      if (arr[i][key] === val) {
        return i
      }
    }
    return -1
  }

  // 创建蓝牙连接
  createBLEConnection = (deviceId, name) => {
    Taro.showLoading()
    Taro.createBLEConnection({
      deviceId,
      success: () => {
        console.log('连接成功');
        this.setState({
          connected: true,
          name,
        })
        this.getBLEDeviceServices(deviceId)
      },
      complete() {
        Taro.hideLoading()
      },
      fail: (res) => {
        console.log('createBLEConnection fail', res)
      }
    })
  }

  // 获取蓝牙设备所有服务(service)
  // 服务不只一个，但可能只有其中一个能用，所有要遍历所有，试试
  getBLEDeviceServices(deviceId) {
    Taro.getBLEDeviceServices({
      deviceId,
      success: (res) => {
        for (let i = 0; i < res.services.length; i++) {
          if (res.services[i].isPrimary) {
            this.getBLEDeviceCharacteristics(deviceId, res.services[i].uuid)
          }
        }
      }
    })
  }

  getBLEDeviceCharacteristics(deviceId, serviceId) {
    Taro.getBLEDeviceCharacteristics({
      deviceId,
      serviceId,
      success: (res) => {
        console.log('getBLEDeviceCharacteristics success', res.characteristics)
        // 这里会存在特征值是支持write，写入成功但是没有任何反应的情况
        // 只能一个个去试
        for (let i = 0; i < res.characteristics.length; i++) {
          const item = res.characteristics[i]
          if (item.properties.write) {
            this.setState({
              canWrite: true,
            })
            this._deviceId = deviceId
            this._serviceId = serviceId
            this._characteristicId = item.uuid
            break;
          }
        }
      },
      fail(res) {
        console.error('getBLEDeviceCharacteristics', res)
      }
    })
  }

  // 断开连接
  closeBLEConnection = () => {
    Taro.closeBLEConnection({
      deviceId: this.data.deviceId
    })

    this.setState({
      connected: false,
      chs: [],
      canWrite: false,
    })
  }

  // 写入数据
  writeBLECharacteristicValue = () => {
    // 单号
    const barcode = '376714121'
    // 地点
    const distributing = '上海 上海市 长宁区'
    // 寄件人
    const receiver_name = '申大通'
    // 寄件人电话
    const receiver_phone = '13826514987'
    // 寄件人地址
    const receiver_address1 = '上海市宝山区共和新路4719弄共'
    // 寄件人具体地址
    const receiver_address2 = '和小区12号306室'
    // 收件人
    const sender_name = '快小宝'
    // 寄件人电话
    const sender_phone = '13826514987'

    const sender_address1 = '上海市长宁区北曜路1178号（鑫达商务楼）'

    const sender_address2 = '1号楼305室'

    let str = "! 0 200 200 1408 1 \r\n" +
      "PAGE - WIDTH 576 \r\n" +
      "BOX 0 0 576 664 2 \r\n" +
      "LINE 0 88 576 88 1 \r\n" +
      "LINE 0 216 576 216 1 \r\n" +
      "LINE 0 296 576 296 1 \r\n" +
      "LINE 0 440 528 440 1 \r\n" +
      "LINE 0 568 528 568 1 \r\n" +
      "LINE 0 664 528 664 1 \r\n" +
      "LINE 528 296 528 664 1 \r\n" +
      "LINE 48 296 48 568 1 \r\n" +
      "CENTER \r\n" +
      "BARCODE 128 2 3 80 0 100 " + barcode + " \r\n" +
      "SETSP 12 \r\n" +
      "T 8 0 0 188 363604310467 \r\n" +
      "SETSP O \r\n" +
      "SETMAG 2 2 \r\n" +
      `T 8 0 0  236 ${distributing} \r\n` +
      "SETMAG 1 1 \r\n" +
      "LEFT \r\n" +
      "SETBOLD 1 \r\n" +
      `T 4 0 64 320 ${receiver_name} ${receiver_phone} \r\n` +
      `T 4 0 64 363 ${receiver_address1} \r\n` +
      `T 4 0 64 395 ${receiver_address2} \r\n` +
      "SETBOLD 0 \r\n" +
      "T 8 0 13.6 334.4 收 \r\n" +
      "T 8 0 13.6 380.4 件 \r\n" +
      "T 8 0 13.6 470.4 发 \r\n" +
      "T 8 0 13.6 516.4 件 \r\n" +
      `T 8 0 64 464 ${sender_name} ${sender_phone} \r\n` +
      `T 8 0 64 500.8 ${sender_address1} \r\n` +
      `T 8 0 64 528.8 ${sender_address2} \r\n` +
      "T 8 0 541.6 400 派 \r\n" +
      "T 8 0 541.6 464 件 \r\n" +
      "T 8 0 541.6 528 联 \r\n" +
      "T 8 0 16 586.4 签收人 / 签收时间 \r\n" +
      "T 55 0 16 615.2 你的签字代表您已验收此包裹，并已确认商品信息 \r\n" +
      "T 55 0 16 639.2 无误, 包装完好, 没有划痕, 破损等表面质量问题。 \r\n" +
      "T 8 0 450 629.2 月  日 \r\n" +
      "BOX 0 696 576 968 2 \r\n" +
      "LINE 0 776 576 776 1 \r\n" +
      "LINE 0 912 528 912 1 \r\n" +
      "LINE 48 776 48 912 1 \r\n" +
      "LINE 0 968 576 968 1 \r\n" +
      "LINE 528 776 528 968 1 \r\n" +
      `BARCODE 128 1 3 36 352 712 ${barcode} \r\n` +
      "SETSP 10 \r\n" +
      `T 55 0 352 752 ${barcode} \r\n` +
      "SETSP 0 \r\n" +
      "T 8 0 13.6 810.4 发 \r\n" +
      "T 8 0 13.6 856.4 件 \r\n" +
      `T 8 0 64 804 ${sender_name} ${sender_phone} \r\n` +
      `T 8 0 64 840.8 ${sender_address1} \r\n` +
      `T 8 0 64 868.8 ${sender_address2} \r\n` +
      "T 8 0 541.6 808 客 \r\n" +
      "T 8 0 541.6 862 户 \r\n" +
      "T 8 0 541.6 916 联 \r\n" +
      "T 8 0 16 928 物品： \r\n" +
      "BOX 0 1000 576 1408 2 \r\n" +
      "LINE 0 1080 576 1080 1 \r\n" +
      "LINE 0 1216 528 1216 1 \r\n" +
      "LINE 0 1352 528 1352 1 \r\n" +
      "LINE 0 1408 576 1408 1 \r\n" +
      "LINE 48 1080 48 1352 1 \r\n" +
      "LINE 528 1080 528 1408 1 \r\n" +
      `BARCODE 128 1 3 36 352 1016 ${barcode} \r\n` +
      "SETSP 10 \r\n" +
      `T 55 0 352 1056 ${barcode} \r\n` +
      "SETSP 0 \r\n" +
      "T 8 0 13.6 1114.4 收 \r\n" +
      "T 8 0 13.6 1160.4 件 \r\n" +
      "T 8 0 13.6 1250.4 发 \r\n" +
      "T 8 0 13.6 1296.4 件 \r\n" +
      `T 8 0 64 1108 ${receiver_name} ${receiver_phone} \r\n` +
      `T 8 0 64 1144.8 ${receiver_address1} \r\n` +
      `T 8 0 64 1172.8 ${receiver_address2} \r\n` +
      `T 8 0 64 1244 ${sender_name} ${sender_phone} \r\n` +
      `T 8 0 64 1280.8 ${sender_address1}） \r\n` +
      `T 8 0 64 1308.8 ${sender_address2} \r\n` +
      "T 8 0 13.6 1368 物品： \r\n" +
      "T 8 0 541.6 1164.8 寄 \r\n" +
      "T 8 0 541.6 1234.8 件 \r\n" +
      "T 8 0 541.6 1304.8 联 \r\n" +
      "PRINT \r\n"

    this._writeBLECharacteristicValue(this._printf(str))
  }


  // 分开发送,一次发送20个字符
  _writeBLECharacteristicValue(buffer) {
    let byteLength = buffer.byteLength
    if (byteLength > 0) {
      var that = this
      Taro.writeBLECharacteristicValue({
        // 这里的 deviceId 需要在上面的 getBluetoothDevices 或 onBluetoothDeviceFound 接口中获取
        deviceId: this._deviceId,
        // 这里的 serviceId 需要在上面的 getBLEDeviceServices 接口中获取
        serviceId: this._serviceId,
        // 这里的 characteristicId 需要在上面的 getBLEDeviceCharacteristics 接口中获取
        characteristicId: this._characteristicId,
        // 这里的value是ArrayBuffer类型
        value: buffer.slice(0, 20),
        success: function (res) {
          console.log('writeBLECharacteristicValue success', res)
          if (byteLength > 20) {
            // 递归发送
            that._writeBLECharacteristicValue(buffer.slice(20, byteLength))
          }
        },
        fail: function (err) {
          console.log('writeBLECharacteristicValue fail', err)
        }
      })
    }
  }


  // 对数据变成gd2312编码,转进制处理
  _printf = (content) => {
    let buffer = new Encoding.TextEncoder("gb2312", { NONSTANDARD_allowLegacyEncoding: true }).encode(content).buffer
    return buffer
  }

  render() {
    const { devices, connected, chs, name, canWrite } = this.state
    return (
      <View className='index'>
        <Button onClick={this.openBlueTooth}>开始扫码</Button>
        {devices.map((item) => {
          return <View className='device-item' key={item.deviceId}
            onClick={this.createBLEConnection.bind(this, item.deviceId, item.name)}
          >{item.name}</View>
        })}

        {connected && <View className='m-t-20'>
          <View>已连接到 {name}</View>
          {chs.map((item) => {
            return <View key={item.uuid}>
              <View>UUID: {item.uuid}</View>
              <View>特性值: {item.value}</View>
            </View>
          })}
        </View>}

        {canWrite && <View className='m-t-20'>
          <Button onClick={this.writeBLECharacteristicValue}>写数据</Button>
          <Button onClick={this.closeBLEConnection}>断开连接</Button>
        </View>}
      </View>
    )
  }
}

