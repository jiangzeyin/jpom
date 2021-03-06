<template>
  <div>
    <div ref="filter" class="filter">
      <a-select v-model="listQuery.group" allowClear placeholder="请选择分组"
        class="filter-item" @change="handleFilter">
        <a-select-option v-for="group in groupList" :key="group">{{ group }}</a-select-option>
      </a-select>
      <a-button type="primary" @click="handleAdd">新增</a-button>
      <a-button type="primary" @click="handleFilter">刷新</a-button>
    </div>
    <!-- 数据表格 -->
    <a-table :data-source="list" :loading="loading" :columns="columns" :pagination="false" bordered :rowKey="(record, index) => index"
      :style="{'max-height': tableHeight + 'px' }" :scroll="{x: 1330, y: tableHeight - 60}">
      <a-tooltip slot="name" slot-scope="text" placement="topLeft" :title="text">
        <span>{{ text }}</span>
      </a-tooltip>
      <a-switch slot="status" slot-scope="text" :checked="text" disabled checked-children="开" un-checked-children="关"/>
      <a-tooltip slot="port" slot-scope="text, record" placement="topLeft" :title="`进程号：${record.pid},  端口号：${record.port}`">
        <span v-if="record.pid">{{record.pid}}/{{ record.port }}</span>
      </a-tooltip>
      <template slot="operation" slot-scope="text, record">
        <a-button type="primary" @click="handleEdit(record)">编辑</a-button>
        <a-button type="primary" @click="handleFile(record)">文件</a-button>
        <a-button type="primary" @click="handleConsole(record)" v-show="record.runMode!=='File'">控制台</a-button>
        <a-button type="primary" @click="handleMonitor(record)" v-show="record.runMode!=='File'" :disabled="!record.status">监控</a-button>
        <a-button type="primary" @click="handleReplica(record)" v-show="record.runMode!=='File'" :disabled="!record.javaCopyItemList">副本集</a-button>
        <a-button type="danger" @click="handleDelete(record)">删除</a-button>
      </template>
    </a-table>
    <!-- 编辑区 -->
    <a-modal v-model="editProjectVisible" width="800px" title="编辑项目" @ok="handleEditProjectOk" :maskClosable="false">
      <a-form-model ref="editProjectForm" :rules="rules" :model="temp" :label-col="{ span: 6 }" :wrapper-col="{ span: 14 }">
        <a-form-model-item label="项目 ID" prop="id">
          <a-input v-model="temp.id" :disabled="temp.type === 'edit'" placeholder="创建之后不能修改"/>
        </a-form-model-item>
        <a-form-model-item label="项目名称" prop="name">
          <a-input v-model="temp.name" placeholder="项目名称"/>
        </a-form-model-item>
        <a-form-model-item label="运行方式" prop="runMode">
          <a-select v-model="temp.runMode" placeholder="请选择运行方式">
            <a-select-option v-for="runMode in runModeList" :key="runMode">{{ runMode }}</a-select-option>
          </a-select>
        </a-form-model-item>
        <a-form-model-item label="项目白名单路径" prop="whitelistDirectory" class="jpom-node-project-whitelist">
          <a-select v-model="temp.whitelistDirectory" placeholder="请选择项目白名单路径">
            <a-select-option v-for="access in accessList" :key="access">{{ access }}</a-select-option>
          </a-select>
        </a-form-model-item>
        <a-form-model-item label="项目文件夹" prop="lib">
          <a-input v-model="temp.lib" placeholder="项目存储的文件夹" @blur.native="checkLibIndexExist" />
          <span class="lib-exist" v-show="temp.libExist">当前文件夹已存在,创建成功后会自动同步文件.</span>
        </a-form-model-item>
        <a-form-model-item v-show="filePath !== ''" label="项目完整目录">
          <a-alert :message="filePath" type="success" />
        </a-form-model-item>
        <a-form-model-item v-show="temp.type === 'edit'" label="日志目录">
          <a-input v-model="temp.logPath" placeholder="日志目录" />
        </a-form-model-item>
        <a-form-model-item label="分组名称" prop="group">
          <a-row>
            <a-col :span="18">
              <a-select v-model="temp.group" placeholder="可手动输入">
                <a-select-option v-for="group in groupList" :key="group">{{ group }}</a-select-option>
              </a-select>
            </a-col>
            <a-col :span="6">
              <a-popover v-model="addGroupvisible" title="添加分组" trigger="click">
                <template slot="content">
                  <a-row>
                    <a-col :span="18">
                      <a-input v-model="temp.tempGroup" placeholder="分组名称"/>
                    </a-col>
                    <a-col :span="6">
                      <a-button type="primary" @click="handleAddGroup">确认</a-button>
                    </a-col>
                  </a-row>
                </template>
                <a-button type="primary" class="btn-add">添加分组</a-button>
              </a-popover>
            </a-col>
          </a-row>
        </a-form-model-item>
        <a-form-model-item label="JDK" prop="jdkId" v-show="temp.runMode !== 'File'" class="jpom-node-project-jdk">
          <a-select v-model="temp.jdkId" placeholder="请选择 JDK">
            <a-select-option v-for="jdk in jdkList" :key="jdk.id">{{ jdk.name }}</a-select-option>
          </a-select>
        </a-form-model-item>
        <a-form-model-item label="Main Class" prop="mainClass" v-show="temp.runMode !== 'Jar' && temp.runMode !== 'File'">
          <a-input v-model="temp.mainClass" placeholder="程序运行的 main 类(jar 模式运行可以不填)"/>
        </a-form-model-item>
        <a-form-model-item label="JavaExtDirsCp" prop="javaExtDirsCp" v-show="temp.runMode === 'JavaExtDirsCp' && temp.runMode !== 'File'">
          <a-input v-model="temp.javaExtDirsCp" placeholder="-Dext.dirs=xxx: -cp xx  填写【xxx:xx】"/>
        </a-form-model-item>
        <a-form-model-item label="JVM 参数" prop="jvm" v-show="temp.runMode !== 'File'">
          <a-textarea v-model="temp.jvm" :auto-size="{ minRows: 3, maxRows: 3 }" placeholder="jvm参数,非必填.如：-Xms512m -Xmx512m"/>
        </a-form-model-item>
        <a-form-model-item label="args 参数" prop="args"  v-show="temp.runMode !== 'File'">
          <a-textarea v-model="temp.args" :auto-size="{ minRows: 3, maxRows: 3 }" placeholder="Main 函数 args 参数，非必填. 如：--service.port=8080"/>
        </a-form-model-item>
        <!-- 副本信息 -->
        <a-row v-for="replica in temp.javaCopyItemList" :key="replica.id" >
          <a-form-model-item :label="`副本 ${replica.id} JVM 参数`" prop="jvm">
            <a-textarea v-model="replica.jvm" :auto-size="{ minRows: 3, maxRows: 3 }" class="replica-area" placeholder="jvm参数,非必填.如：-Xms512m -Xmx512m"/>
          </a-form-model-item>
          <a-form-model-item :label="`副本 ${replica.id} args 参数`" prop="args">
            <a-textarea v-model="replica.args" :auto-size="{ minRows: 3, maxRows: 3 }" class="replica-area" placeholder="Main 函数 args 参数，非必填. 如：--service.port=8080"/>
          </a-form-model-item>
          <a-tooltip placement="topLeft" title="已经添加成功的副本需要在副本管理页面去删除" class="replica-btn-del">
            <a-button :disabled="!replica.deleteAble" type="danger" @click="handleDeleteReplica(replica)">删除</a-button>
          </a-tooltip>
        </a-row>
        <!-- 添加副本 -->
        <a-form-model-item label="操作"   v-show="temp.runMode !== 'File'">
          <a-button type="primary" @click="handleAddReplica">添加副本</a-button>
        </a-form-model-item>
        <a-form-model-item label="WebHooks" prop="token"  v-show="temp.runMode !== 'File'" class="jpom-node-project-token">
          <a-input v-model="temp.token" placeholder="关闭程序时自动请求,非必填，GET请求"/>
        </a-form-model-item>
        <a-form-model-item v-show="temp.type === 'edit'&&temp.runMode !== 'File'" label="日志路径" prop="log">
          <a-alert :message="temp.log" type="success" />
        </a-form-model-item>
        <a-form-model-item v-show="temp.type === 'edit'&&temp.runMode !== 'File'" label="运行命令" prop="runCommand">
          <a-alert :message="temp.runCommand || '无'" type="success" />
        </a-form-model-item>
      </a-form-model>
    </a-modal>
    <!-- 项目文件组件 -->
    <a-drawer :title="drawerTitle" placement="right" width="85vw"
      :visible="drawerFileVisible" @close="onFileClose">
      <file v-if="drawerFileVisible" :nodeId="node.id" :projectId="temp.id" :runMode="temp.runMode" :absPath="(temp.whitelistDirectory || '') + (temp.lib || '')"  @goConsole="goConsole" />
    </a-drawer>
    <!-- 项目控制台组件 -->
    <a-drawer :title="drawerTitle" placement="right" width="85vw"
      :visible="drawerConsoleVisible" @close="onConsoleClose">
      <console v-if="drawerConsoleVisible" :nodeId="node.id" :projectId="temp.id" @goFile="goFile" />
    </a-drawer>
    <!-- 项目监控组件 -->
    <a-drawer :title="drawerTitle" placement="right" width="85vw"
      :visible="drawerMonitorVisible" @close="onMonitorClose">
      <monitor v-if="drawerMonitorVisible" :node="node" :project="temp" />
    </a-drawer>
    <!-- 项目副本集组件 -->
    <a-drawer :title="drawerTitle" placement="right" width="85vw"
      :visible="drawerReplicaVisible" @close="onReplicaClose">
      <replica v-if="drawerReplicaVisible" :node="node" :project="temp" />
    </a-drawer>
  </div>
</template>
<script>
import { mapGetters } from 'vuex';
import File from './project-file';
import Console from './project-console';
import Monitor from './project-monitor';
import Replica from  './project-replica';
import { getJdkList, getRuningProjectInfo, getProjectData, deleteProject, getProjectList, getPorjectGroupList, getProjectAccessList, editProject, nodeJudgeLibExist } from '../../../../api/node-project';
export default {
  props: {
    node: {
      type: Object
    }
  },
  components: {
    File,
    Console,
    Monitor,
    Replica
  },
  data() {
    return {
      loading: false,
      listQuery: {},
      tableHeight: '70vh',
      groupList: [],
      accessList: [],
      jdkList: [],
      runModeList: [
        'ClassPath',
        'Jar',
        'JarWar',
        'JavaExtDirsCp',
       'File'
      ],
      list: [],
      temp: {},
      editProjectVisible: false,
      drawerTitle: '',
      drawerFileVisible: false,
      drawerConsoleVisible: false,
      drawerMonitorVisible: false,
      drawerReplicaVisible: false,
      addGroupvisible: false,
      libExist:false,
      checkRecord:'',
      columns: [
        {title: '项目名称', dataIndex: 'name', width: 150, ellipsis: true, scopedSlots: {customRender: 'name'}},
        {title: '创建时间', dataIndex: 'createTime', width: 160, ellipsis: true, scopedSlots: {customRender: 'createTime'}},
        {title: '修改时间', dataIndex: 'modifyTime', width: 160, ellipsis: true, scopedSlots: {customRender: 'modifyTime'}},
        {title: '最后操作人', dataIndex: 'modifyUser', width: 150, ellipsis: true, scopedSlots: {customRender: 'modifyUser'}},
        {title: '运行状态', dataIndex: 'status', width: 100, ellipsis: true, scopedSlots: {customRender: 'status'}},
        {title: 'PID/端口', dataIndex: 'port', width: 100, ellipsis: true, scopedSlots: {customRender: 'port'}},
        {title: '操作', dataIndex: 'operation', scopedSlots: {customRender: 'operation'}, width: 500}
      ],
      rules: {
        id: [
          { required: true, message: 'Please input project id', trigger: 'blur' }
        ],
        name: [
          { required: true, message: 'Please input project name', trigger: 'blur' }
        ],
        runMode: [
          { required: true, message: 'Please select project runMode', trigger: 'blur' }
        ],
        whitelistDirectory: [
          { required: true, message: 'Please select project access path', trigger: 'blur' }
        ],
        lib: [
          { required: true, message: 'Please input project lib', trigger: 'blur' }
        ]
      }
    }
  },
  computed: {
    ...mapGetters([
      'getGuideFlag'
    ]),
    filePath() {
      return (this.temp.whitelistDirectory || '') + (this.temp.lib || '');
    }
  },
  watch: {
    getGuideFlag() {
      this.introGuide();
    }
  },
  mounted() {
    this.calcTableHeight();
    this.loadGroupList();
    this.loadAccesList();
    this.loadJdkList();
    this.handleFilter();
  },
  methods: {
    // 页面引导
    introGuide() {
      if (this.getGuideFlag) {
        this.$introJs().setOptions({
          hidePrev: true,
          steps: [{
            title: 'Jpom 导航助手',
            element: document.querySelector('.jpom-node-project-whitelist'),
            intro: '这里是选择节点设置的白名单目录，白名单的设置在侧边栏菜单<b>系统管理</b>里面。'
          }, {
            title: 'Jpom 导航助手',
            element: document.querySelector('.jpom-node-project-jdk'),
            intro: '这里选择 JDK，JDK 需要在侧边栏菜单里手动添加，并非直接读取节点服务器里面的 JDK。'
          }, {
            title: 'Jpom 导航助手',
            element: document.querySelector('.jpom-node-project-token'),
            intro: '这里可以理解为当程序停止时会给这个地址发送一个 HTTP GET 请求。'
          }]
        }).start();
        return false;
      }
      this.$introJs().exit();
    },
    // 计算表格高度
    calcTableHeight() {
      this.$nextTick(() => {
        this.tableHeight = window.innerHeight - this.$refs['filter'].clientHeight - 155;
      })
    },
    // 加载分组列表
    loadGroupList() {
      getPorjectGroupList(this.node.id).then(res => {
        if (res.code === 200) {
          this.groupList = res.data;
        }
      })
    },
    // 加载项目白名单列表
    loadAccesList() {
      getProjectAccessList(this.node.id).then(res => {
        if (res.code === 200) {
          this.accessList = res.data;
        }
      })
    },
    // 加载 JDK 列表
    loadJdkList() {
      getJdkList(this.node.id).then(res => {
        if (res.code === 200) {
          this.jdkList = res.data;
        }
      })
    },
    // 加载数据
    async loadData() {
      this.loading = true;
      const params = {
        nodeId: this.node.id,
        group: this.listQuery.group
      }
      const res1 = await getProjectList(params);
      if (res1.code === 200) {
        this.list = res1.data;
        const ids = [];
        if (res1.data) {
          res1.data.forEach(element => {
            ids.push(element.id);
          });
        }
        // 如果 ids 有数据就继续请求
        if (ids.length > 0) {
          const tempParams = {
            nodeId: this.node.id,
            ids: JSON.stringify(ids)
          }
          const res2 = await getRuningProjectInfo(tempParams);
          if (res2.code === 200) {
            this.list.forEach(element => {
              if (res2.data[element.id]) {
                element.port = res2.data[element.id].port;
                element.pid = res2.data[element.id].pid;
              }
            })
          }
        }
      }
      this.loading = false;
    },
    // 筛选
    handleFilter() {
      this.loadData();
    },
    // 添加
    handleAdd() {
      this.temp = {
        type: 'add',
        javaCopyItemList: []
      };
      this.editProjectVisible = true;
      this.$nextTick(() => {
        setTimeout(() => {
          this.introGuide();
        }, 500);
      })
    },
    // 编辑
    handleEdit(record) {
      const params = {
        id: record.id,
        nodeId: this.node.id
      }
      getProjectData(params).then(res => {
        if (res.code === 200) {
          this.temp = {
            ...res.data,
            type: 'edit'
          };
          if (!this.temp.javaCopyItemList) {
            this.temp = {
              ...this.temp,
              javaCopyItemList: []
            };
          }
          this.editProjectVisible = true;
        }
      })
    },
    // 添加副本
    handleAddReplica() {
      const $chars = 'ABCDEFGHJKMNPQRSTWXYZ0123456789';
      /****默认去掉了容易混淆的字符oOLl,9gq,Vv,Uu,I1****/
      const maxPos = $chars.length;
      let repliccaId = '';
      for (let i = 0; i < 2; i++) {
        repliccaId += $chars.charAt(Math.floor(Math.random() * maxPos));
      }
      this.temp.javaCopyItemList.push({
        id: repliccaId,
        jvm: '',
        args: '',
        deleteAble: true
      })
    },
    // 移除副本
    handleDeleteReplica(reeplica) {
      const index = this.temp.javaCopyItemList.findIndex(element => element.id === reeplica.id);
      const newList = this.temp.javaCopyItemList.slice();
      newList.splice(index, 1);
      this.temp.javaCopyItemList = newList;
    },
    // 提交
    handleEditProjectOk() {
      // 检验表单
      this.$refs['editProjectForm'].validate((valid) => {
        if (!valid) {
          return false;
        }
        const params = {
          ...this.temp,
          nodeId: this.node.id
        }
        // 额外参数
        const replicaParams = {};
        let javaCopyIds = '';
        this.temp.javaCopyItemList.forEach(element => {
          javaCopyIds += `${element.id},`;
          replicaParams[`jvm_${element.id}`] = element.jvm;
          replicaParams[`args_${element.id}`] = element.args;
        })
        replicaParams['javaCopyIds'] = javaCopyIds.substring(0, javaCopyIds.length-1);
        editProject(params, replicaParams).then(res => {
          if (res.code === 200) {
            this.$notification.success({
              message: res.msg,
              duration: 2
            });
            this.$refs['editProjectForm'].resetFields();
            this.editProjectVisible = false;
            this.handleFilter();
          }
        })
      })
    },
    // 文件管理
    handleFile(record) {
      this.checkRecord=record;
      this.temp = Object.assign(record);
      this.drawerTitle = `文件管理(${this.temp.name})`
      this.drawerFileVisible = true;
    },
    // 关闭文件管理对话框
    onFileClose() {
      this.drawerFileVisible = false;
    },
    // 控制台
    handleConsole(record) {
      this.checkRecord=record;
      this.temp = Object.assign(record);
      this.drawerTitle = `控制台(${this.temp.name})`;
      this.drawerConsoleVisible = true;
    },
    // 关闭控制台
    onConsoleClose() {
      this.drawerConsoleVisible = false;
      this.handleFilter();
    },
    // 监控
    handleMonitor(record) {
      this.temp = Object.assign(record);
      this.drawerTitle = `监控(${this.temp.name})`;
      this.drawerMonitorVisible = true;
    },
    // 关闭监控
    onMonitorClose() {
      this.drawerMonitorVisible = false;
    },
    // 副本集
    handleReplica(record) {
      this.temp = Object.assign(record);
      this.drawerTitle = `副本集(${this.temp.name})`;
      this.drawerReplicaVisible = true;
    },
    // 关闭副本集
    onReplicaClose() {
      this.drawerReplicaVisible = false;
    },
    // 删除 
    handleDelete(record) {
      this.$confirm({
        title: '系统提示',
        content: '真的要删除项目么？',
        okText: '确认',
        cancelText: '取消',
        onOk: () => {
          // 删除
          const params = {
            nodeId: this.node.id,
            id: record.id
          }
          deleteProject(params).then((res) => {
            if (res.code === 200) {
              this.$notification.success({
                message: res.msg,
                duration: 2
              });
              this.loadData();
            }
          })
        }
      });
    },
    // 添加分组
    handleAddGroup() {
      if (!this.temp.tempGroup || this.temp.tempGroup.length === 0) {
        this.$notification.warning({
          message: '分组名称不能为空',
          duration: 2
        });
        return false;
      }
      // 添加到分组列表
      if (this.groupList.indexOf(this.temp.tempGroup) === -1) {
        this.groupList.push(this.temp.tempGroup);
      }
      this.temp.tempGroup = '';
      this.$notification.success({
        message: '添加成功',
        duration: 2
      });
      this.addGroupvisible = false;
    },
      //检查节点是否存在
    checkLibIndexExist(){
      // 检查是否输入完整
      if (this.temp.lib && this.temp.lib.length !== 0 && this.temp.whitelistDirectory && this.temp.whitelistDirectory.length !== 0){
        const params = {
          nodeId: this.node.id,
          newLib: this.temp.whitelistDirectory+this.temp.lib
        }
        nodeJudgeLibExist(params).then((res) => {
          if (res.code === 401) {
            this.temp.libExist = true;
            this.temp = {...this.temp};
          }
        })
      }
   },
     //前往控制台
    goConsole(){
       //关闭文件
       this.onFileClose();
       this.handleConsole(this.checkRecord);
    },
      //前往文件
    goFile(){
     // 关闭控制台
     this.onConsoleClose();
     this.handleFile(this.checkRecord);
    },
  },
}
</script>
<style scoped>
.filter {
  margin-bottom: 10px;
}
.ant-btn {
  margin-right: 10px;
}
.filter-item {
  width: 150px;
  margin-right: 10px;
}
.btn-add {
  margin-left: 10px;
  margin-right: 0;
}
.replica-area {
  width: 340px;
}
.replica-btn-del {
  position: absolute;
  right: 120px;
  top: 74px;
}
.lib-exist {
 color: #faad14;
}
</style>