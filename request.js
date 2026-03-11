//定制请求的实例

//导入axios  npm install axios
import axios from 'axios';
import {useUserStore} from '@/stores/user.js'
import { ElMessage } from 'element-plus'
//定义一个变量,记录公共的前缀  ,  baseURL
// 开发环境：使用代理路径（解决跨域问题）
// 代理配置：/api -> http://localhost:9096 (去掉/api前缀)
// const baseURL = '/api';
// 生产环境：使用真实后端地址
const baseURL = 'http://localhost:9096';
const instance = axios.create({ baseURL })

//添加请求拦截器
instance.interceptors.request.use(
    (config)=>{
        //请求前的回调
        //携带token
        const tokenStore = useUserStore();
        //判断有没有token
        if(tokenStore.token){
          // 后端控制器按 Authorization: Bearer <token> 解析，这里自动补全 Bearer 前缀
          const raw = tokenStore.token
          const hasBearer = /^Bearer\s+/i.test(raw)
          config.headers.Authorization = hasBearer ? raw : `Bearer ${raw}`
        }

        // 如果数据是 FormData，确保不手动设置 Content-Type，让 axios 自动处理边界
        if (config.data instanceof FormData) {
          // 删除手动设置的 Content-Type，让 axios 自动设置（包含边界）
          delete config.headers['Content-Type']
        }

        return config;
    },
    (err)=>{
        //请求错误的回调
        Promise.reject(err)
    }
)

/* import {useRouter} from 'vue-router'
const router = useRouter(); */
import router from '@/router'
//添加响应拦截器
instance.interceptors.response.use(
    (result) => {
        // 优先判断后端统一包装 { code, data, msg }
        if (result && result.data && typeof result.data === 'object' && 'code' in result.data) {
            if (result.data.code === 200) {
                return result.data
            }
            // 标记错误已被处理，避免在组件中重复显示
            const errorData = {
                ...result.data,
                _errorHandled: true,
                message: result.data.msg || '服务异常'
            }
            ElMessage.error(errorData.message)
            return Promise.reject(errorData)
        }

        // 兼容后端直接返回数组/对象且无 code 字段的情况，HTTP 200 视为成功
        if (result && result.status === 200) {
            return result.data
        }

        // 其他情况视为失败
        const errorData = {
            _errorHandled: true,
            message: '服务异常'
        }
        ElMessage.error(errorData.message)
        return Promise.reject(errorData)

    },
    (err) => {
        console.error('请求错误:', err)

        // 网络错误或服务器无响应
        if (!err.response) {
            ElMessage.error('网络连接失败，请检查网络或后端服务是否正常运行在 http://localhost:9096')
            return Promise.reject(err)
        }

        // 判断响应状态码
        const status = err.response.status
        if (status === 401) {
            ElMessage.error('身份验证失败，请重新登录')
            // 清除token和用户信息
            const userStore = useUserStore()
            userStore.removetoken()
            localStorage.removeItem('userInfo')
            localStorage.removeItem('userRole')
            // 跳转到登录页
            router.push('/')
        } else if (status === 404) {
            ElMessage.error('接口不存在，请检查后端服务是否正常运行，确认接口路径是否正确')
        } else if (status === 500) {
            ElMessage.error('服务器内部错误，请联系管理员')
        } else if (status === 403) {
            ElMessage.error('权限不足，无法访问该资源')
        } else {
            ElMessage.error(`请求失败 (状态码: ${status})，请检查后端服务`)
        }

        return Promise.reject(err)
    }
)

export default instance;
export {baseURL};
