<template>
  <a-layout class="log-layout">
    <!-- 侧边栏 文件树 -->
    <a-layout-sider theme="light" class="sider" width="20%">
      <a-empty v-if="list.length === 0" />
      <a-directory-tree :treeData="list" :replaceFields="replaceFields" @select="select"
        @rightClick="rightClick" default-expand-all>
      </a-directory-tree>
    </a-layout-sider>
    <!-- 单个文件内容 -->
    <a-layout-content class="log-content">
      <div class="filter">
        <a-button type="primary" @click="loadData">刷新</a-button>
      </div>
      <div>
        <a-input v-model="logContext" readOnly type="textarea" style="resize: none;height: calc(100vh - 165px);"/>
      </div>
    </a-layout-content>
    <!-- 对话框 -->
    <a-modal v-model="visible" title="系统提示" :footer="null">
      <div class="op-btn">
        <a-button type="danger" @click="deleteLog">删除日志文件</a-button>
        <a-button type="primary" @click="downloadLog">下载日志文件</a-button>
        <a-button @click="visible = false">取消</a-button>
      </div>
    </a-modal>
  </a-layout>
</template>
<script>
import { getLogList, downloadFile, deleteLog } from '../../api/system';
import { mapGetters } from 'vuex';
export default {
  data() {
    return {
      list: [],
      socket: null,
      // 日志内容
      logContext: '',
      tomcatId: 'system',
      nodeId: 'system',
      replaceFields: {
        children: 'children',
        title: 'title',
        key: 'path'
      },
      visible: false,
      temp: {}
    }
  },
  computed: {
    ...mapGetters([
      'getToken'
    ]),
    socketUrl() {
      const protocol = location.protocol === 'https' ? 'wss://' : 'ws://';
      return `${protocol}${location.host}/tomcat_log?userId=${this.getToken}&tomcatId=${this.tomcatId}&nodeId=${this.nodeId}&type=tomcat`;
    }
  },
  created() {
    this.loadData();
    // this.initWebSocket();
  },
  beforeDestroy() {
    this.socket.close();
  },
  methods: {
    // 加载数据
    loadData() {
      this.list = [];
      getLogList().then(res => {
        if (res.code === 200) {
          res.data.forEach(element => {
            if (element.children) {
              this.calcTreeNode(element.children);
            }
            // 组装数据
            this.list.push({
              ...element,
              isLeaf: !element.children ? true : false
            });
          });
        }
      })
    },
    // 递归处理节点
    calcTreeNode(list) {
      list.forEach(element => {
        if (element.children) {
          this.calcTreeNode(element.children);
        } else {
          // 叶子节点
          element.isLeaf = true;
        }
      })
    },
    // 选择节点
    select(selectedKeys, {node}) {
      const data = {
        op: 'showlog',
        tomcatId: this.tomcatId,
        fileName: node.dataRef.path
      }
      this.logContext = '';
      if (!this.socket || this.socket.readyState !== this.socket.OPEN || this.socket.readyState !== this.socket.CONNECTING) {
        this.socket = new WebSocket(this.socketUrl);
      }
      // 连接成功后
      this.socket.onopen = () => {
        this.socket.send(JSON.stringify(data));
      }
      this.socket.onmessage = (msg) => {
        this.logContext += `${msg.data}\r\n`;
      }
    },
    // 右键点击
    rightClick({node}) {
      this.temp = node.dataRef;
      // 弹出提示 下载还是删除
      this.visible = true;
    },
    // 下载文件
    downloadLog() {
      // 请求参数
      const params = {
        nodeId: null,
        path: this.temp.path
      }
      // 请求接口拿到 blob
      downloadFile(params).then(blob => {
        const url = window.URL.createObjectURL(blob);
        let link = document.createElement('a');
        link.style.display = 'none';
        link.href = url;
        link.setAttribute('download', this.temp.title);
        document.body.appendChild(link);
        link.click();
        // 关闭弹窗
        this.visible = false;
      })
    },
    // 删除文件
    deleteLog() {
       this.$confirm({
        title: '系统提示',
        content: '真的要删除日志文件么？',
        okText: '确认',
        cancelText: '取消',
        onOk: () => {
          const params = {
            nodeId: null,
            path: this.temp.path
          }
          // 删除日志
          deleteLog(params).then(res => {
            if(res.code === 200) {
              this.$notification.success({
                message: res.msg,
                duration: 2
              });
              this.visible = false;
              this.loadData();
            }
          })
        }
      })
    }
  }
}
</script>
<style scoped>
.log-layout {
  padding: 0;
  margin: 0;
}
.sider {
  border: 1px solid #e2e2e2;
  height: calc(100vh - 110px);
  overflow-y: auto;
}
.log-content {
  margin: 0;
  padding-left: 15px;
  background: #fff;
  height: calc(100vh - 110px);
  overflow-y: auto;
}
.op-btn {
  text-align: right;
}
.ant-btn {
  margin: 10px;
}
</style>