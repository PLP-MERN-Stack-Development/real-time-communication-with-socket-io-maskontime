import { useEffect, useMemo, useRef, useState } from 'react'
import axios from 'axios'
import {
  Box,
  Button,
  Flex,
  Heading,
  HStack,
  Input,
  List,
  ListItem,
  Spacer,
  Text,
  VStack,
  Badge,
  Avatar,
  IconButton,
} from '@chakra-ui/react'
import { FaPaperPlane, FaPowerOff, FaPlus, FaSignOutAlt } from 'react-icons/fa'
import { ToastContainer, toast } from 'react-toastify'
import 'react-toastify/dist/ReactToastify.css'
import { useSocket } from './socket/socket'
import './App.css'

const API_URL = import.meta.env.VITE_API_URL || import.meta.env.VITE_SOCKET_URL || 'http://localhost:5000'

function App() {
  const {
    isConnected,
    lastMessage,
    messages: liveMessages,
    users,
    typingUsers,
    connect,
    disconnect,
    sendMessage,
    sendPrivateMessage,
    setTyping,
    rooms,
    currentRoom,
    joinRoom,
    leaveRoom,
  } = useSocket()

  const [username, setUsername] = useState('')
  const [input, setInput] = useState('')
  const [initialMessages, setInitialMessages] = useState([])
  const [initialUsers, setInitialUsers] = useState([])
  const [selectedUserId, setSelectedUserId] = useState(null)
  const typingTimeoutRef = useRef(null)
  const [newRoom, setNewRoom] = useState('')
  const [file, setFile] = useState(null)

  // Fetch initial REST data (messages + users)
  useEffect(() => {
    const fetchInitial = async () => {
      try {
        const [msgs, usrs] = await Promise.all([
          axios.get(`${API_URL}/api/messages`, { params: currentRoom && currentRoom !== 'general' ? { room: currentRoom } : {} }),
          axios.get(`${API_URL}/api/users`),
        ])
        setInitialMessages(Array.isArray(msgs.data) ? msgs.data : [])
        setInitialUsers(Array.isArray(usrs.data) ? usrs.data : [])
      } catch (err) {
        // Non-blocking error
        toast.warn(`Could not fetch initial data: ${err?.message || ''}`)
      }
    }
    fetchInitial()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [toast, currentRoom])

  // Combined views
  const combinedMessages = useMemo(() => {
    // Avoid duplicates by id when server emits ones that were already in initial
    const map = new Map()
    for (const m of initialMessages) map.set(m.id || `${m.timestamp}-${m.message}`, m)
    for (const m of liveMessages) map.set(m.id || `${m.timestamp}-${m.message}`, m)
    let arr = Array.from(map.values())
    // Filter by current room: 'general' shows messages with room 'general' or undefined
    arr = arr.filter((m) => {
      if (!currentRoom || currentRoom === 'general') return !m.room || m.room === 'general' || m.isPrivate
      return m.room === currentRoom || m.isPrivate
    })
    return arr.sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp))
  }, [initialMessages, liveMessages])

  const combinedUsers = useMemo(() => {
    const map = new Map()
    for (const u of initialUsers) map.set(u.id, u)
    for (const u of users) map.set(u.id, u)
    return Array.from(map.values())
  }, [initialUsers, users])

  // Typing handling
  const handleInputChange = (e) => {
    setInput(e.target.value)
    setTyping(true)
    if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current)
    typingTimeoutRef.current = setTimeout(() => setTyping(false), 1200)
  }

  // Send message (public or private if selected user)
  const handleSend = async () => {
    const text = input.trim()
    if (!text && !file) return

    // Upload file first if present
    let attachmentUrl
    if (file) {
      try {
        const form = new FormData()
        form.append('file', file)
        const res = await axios.post(`${API_URL}/api/upload`, form)
        attachmentUrl = res.data?.url
      } catch (err) {
        toast.error(`Upload failed: ${err?.message || ''}`)
        return
      }
    }

    if (selectedUserId) {
      // PM does not support attachment in current server; send text only
      if (text) sendPrivateMessage(selectedUserId, text)
    } else {
      sendMessage(text, { room: currentRoom, attachmentUrl })
    }
    setInput('')
    setFile(null)
    setTyping(false)
  }

  // Join chat
  const handleJoin = () => {
    const name = username.trim()
    if (!name) {
      toast.info('Enter a username')
      return
    }
    connect(name)
  }

  // Notifications: PMs and messages in other rooms
  useEffect(() => {
    if (!lastMessage) return
    // Private message
    if (lastMessage.isPrivate) {
      toast.info(`PM from ${lastMessage.sender}: ${lastMessage.message || ''}`)
      return
    }
    // Message in a different room
    if (lastMessage.room && lastMessage.room !== currentRoom) {
      toast.info(`New message in ${lastMessage.room}: ${lastMessage.message || ''}`)
    }
  }, [lastMessage, currentRoom, toast])

  return (
    <Flex h="100vh" direction="column" p={4} gap={4}>
      <ToastContainer position="top-right" newestOnTop closeOnClick pauseOnHover />
      <HStack>
        <Heading size="md">Socket.io Chat</Heading>
        <Spacer />
        <Badge colorScheme={isConnected ? 'green' : 'red'}>{isConnected ? 'Connected' : 'Disconnected'}</Badge>
        {isConnected && (
          <IconButton aria-label="Disconnect" icon={<FaPowerOff />} size="sm" onClick={disconnect} />
        )}
      </HStack>
      {!isConnected ? (
        <HStack>
          <Input
            placeholder="Enter a username"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleJoin()}
          />
          <Button colorScheme="blue" onClick={handleJoin}>
            Join
          </Button>
        </HStack>
      ) : null}

      <Flex flex={1} gap={4} minH={0}>
        {/* Rooms column */}
        <Box w={{ base: '35%', md: '22%' }} borderWidth="1px" rounded="md" p={3} overflowY="auto" bg="gray.50">
          <Heading size="sm" mb={2}>Rooms</Heading>
          <HStack mb={2}>
            <Input
              size="sm"
              placeholder="Create/join room"
              value={newRoom}
              onChange={(e) => setNewRoom(e.target.value)}
              onKeyDown={(e)=> {
                if (e.key==='Enter') {
                  const r = newRoom.trim();
                  if (r) {
                    joinRoom(r);
                    setNewRoom('');
                  }
                }
              }}
            />
            <IconButton
              aria-label="Add room"
              icon={<FaPlus />}
              size="sm"
              onClick={() => {
                const r = newRoom.trim();
                if (r) {
                  joinRoom(r);
                  setNewRoom('');
                }
              }}
            />
          </HStack>
          <List spacing={1}>
            {rooms.map((r) => (
              <ListItem key={r}>
                <HStack
                  p={2}
                  rounded="md"
                  _hover={{ bg: 'white' }}
                  bg={currentRoom === r ? 'blue.100' : 'transparent'}
                  cursor="pointer"
                  onClick={() => joinRoom(r)}
                >
                  <Badge colorScheme={currentRoom === r ? 'blue' : 'gray'}>{r}</Badge>
                  <Spacer />
                  {currentRoom === r && r !== 'general' && (
                    <IconButton aria-label="Leave room" icon={<FaSignOutAlt />} size="xs" onClick={() => leaveRoom(r)} />
                  )}
                </HStack>
              </ListItem>
            ))}
          </List>
        </Box>

        {/* Users column */}
        <Box w={{ base: '35%', md: '22%' }} borderWidth="1px" rounded="md" p={3} overflowY="auto">
          <HStack mb={2}>
            <Heading size="sm">Users</Heading>
            <Spacer />
            {selectedUserId && (
              <Button size="xs" onClick={() => setSelectedUserId(null)}>
                Clear PM
              </Button>
            )}
          </HStack>
          <List spacing={1}>
            {combinedUsers.map((u) => (
              <ListItem key={u.id}>
                <HStack
                  p={2}
                  rounded="md"
                  _hover={{ bg: 'gray.50' }}
                  bg={selectedUserId === u.id ? 'blue.50' : 'transparent'}
                  cursor="pointer"
                  onClick={() => setSelectedUserId(u.id)}
                >
                  <Avatar size="xs" name={u.username} />
                  <Text>{u.username}</Text>
                </HStack>
              </ListItem>
            ))}
            {combinedUsers.length === 0 && <Text color="gray.500">No users online</Text>}
          </List>
        </Box>

        <Flex direction="column" flex={1} borderWidth="1px" rounded="md" p={3} minH={0}>
          <VStack align="stretch" spacing={2} flex={1} overflowY="auto">
            {combinedMessages.map((m) => (
              <Box key={m.id || `${m.timestamp}-${m.message}`}> 
                {m.system ? (
                  <Text fontSize="sm" color="gray.500">{m.message}</Text>
                ) : (
                  <>
                    <HStack>
                      <Text fontWeight="bold">{m.sender}</Text>
                      {m.isPrivate && <Badge colorScheme="purple">PM</Badge>}
                      {m.room && !m.isPrivate && <Badge colorScheme="gray">{m.room}</Badge>}
                      <Text fontSize="xs" color="gray.500">{new Date(m.timestamp).toLocaleTimeString()}</Text>
                    </HStack>
                    {m.message && <Text whiteSpace="pre-wrap">{m.message}</Text>}
                    {m.attachmentUrl && (
                      m.attachmentUrl.match(/\.(png|jpg|jpeg|gif|webp)$/i) ? (
                        <Box mt={2}><img src={API_URL + m.attachmentUrl} alt="upload" style={{ maxWidth: '300px', borderRadius: 8 }} /></Box>
                      ) : (
                        <Box mt={2}><a href={API_URL + m.attachmentUrl} target="_blank" rel="noreferrer">Attachment</a></Box>
                      )
                    )}
                    <Box borderTopWidth="1px" my={2} />
                  </>
                )}
              </Box>
            ))}
            {combinedMessages.length === 0 && <Text color="gray.500">No messages yet</Text>}
          </VStack>

          {typingUsers && typingUsers.length > 0 && (
            <Text fontSize="sm" color="gray.600" mt={1}>
              {typingUsers.join(', ')} {typingUsers.length > 1 ? 'are' : 'is'} typing...
            </Text>
          )}

          {isConnected && (
            <VStack align="stretch" spacing={2} mt={2}>
              <HStack>
                <Input type="file" accept="image/*,.pdf,.txt,.doc,.docx" onChange={(e)=> setFile(e.target.files?.[0] || null)} />
                {file && <Badge colorScheme="green">{file.name}</Badge>}
              </HStack>
              <HStack>
                <Input
                  placeholder={selectedUserId ? 'Send a private message...' : `Message ${currentRoom || 'general'}...`}
                  value={input}
                  onChange={handleInputChange}
                  onKeyDown={(e) => e.key === 'Enter' && handleSend()}
                />
                <IconButton aria-label="Send" icon={<FaPaperPlane />} colorScheme="blue" onClick={handleSend} />
              </HStack>
            </VStack>
          )}
        </Flex>
      </Flex>
    </Flex>
  )
}

export default App
